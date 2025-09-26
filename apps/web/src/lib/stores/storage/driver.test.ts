import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalStorageDriver, StorageDriverQuotaError } from "./driver";
import * as environment from "./environment";
import { STORAGE_LOG_PREFIX } from "./logging";
import type { StorageSnapshot } from "./types";

const STORAGE_KEY = "kelpie:test-driver";

const SAMPLE_SNAPSHOT: StorageSnapshot = {
  meta: {
    version: 1,
    installationId: "install-123",
    createdAt: "2024-01-01T00:00:00.000Z",
    lastOpenedAt: "2024-01-02T00:00:00.000Z",
    approxSizeBytes: 0
  },
  config: {
    debounce: { writeMs: 250, broadcastMs: 100 },
    historyRetentionDays: 14,
    historyEntryCap: 50,
    auditEntryCap: 25,
    enableAudit: true,
    redactAuditMetadata: false,
    softDeleteRetentionDays: 7,
    quotaWarningBytes: 5_000,
    quotaHardLimitBytes: 10_000,
    gcIdleTriggerMs: 30_000
  },
  settings: {
    lastActiveDocumentId: null,
    panes: {},
    filters: {},
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
  },
  index: [],
  documents: {},
  history: [],
  audit: []
};

describe("createLocalStorageDriver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if ("localStorage" in globalThis && globalThis.localStorage) {
      globalThis.localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if ("localStorage" in globalThis && globalThis.localStorage) {
      globalThis.localStorage.clear();
    }
  });

  it("loads and parses snapshots from localStorage", () => {
    const driver = createLocalStorageDriver(STORAGE_KEY);
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_SNAPSHOT));

    expect(driver.load()).toEqual(SAMPLE_SNAPSHOT);
  });

  it("invokes corruption handling when the stored payload cannot be parsed", () => {
    const now = () => "2024-05-01T12:00:00.000Z";
    const driver = createLocalStorageDriver(STORAGE_KEY, { now });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const corruption = vi.fn();
    const rawPayload = "not-json";
    globalThis.localStorage.setItem(STORAGE_KEY, rawPayload);

    expect(driver.load({ onCorruption: corruption })).toBeNull();
    expect(corruption).toHaveBeenCalledTimes(1);
    const firstCorruptionCall = corruption.mock.calls[0];
    expect(firstCorruptionCall).toBeDefined();
    const [parseError] = firstCorruptionCall ?? [];
    expect(parseError).toMatchObject({ reason: "parse" });
    expect(warnSpy).toHaveBeenCalledWith(
      `${STORAGE_LOG_PREFIX}: storage snapshot corruption detected (parse)`,
      expect.any(SyntaxError)
    );

    const backupKey = `${STORAGE_KEY}.backup.${now().replace(/[:.]/g, "-")}`;
    expect(globalThis.localStorage.getItem(backupKey)).toBe(rawPayload);
  });

  it("invokes corruption handling when checksum mismatches", () => {
    const now = () => "2024-05-02T15:30:00.000Z";
    const driver = createLocalStorageDriver(STORAGE_KEY, { now });
    driver.save(SAMPLE_SNAPSHOT);

    const tampered = { ...SAMPLE_SNAPSHOT, meta: { ...SAMPLE_SNAPSHOT.meta, installationId: "tampered" } };
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(tampered));
    globalThis.localStorage.setItem(`${STORAGE_KEY}.checksum`, "invalid-checksum");

    const corruption = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(driver.load({ onCorruption: corruption })).toBeNull();
    expect(corruption).toHaveBeenCalledTimes(1);
    const checksumCall = corruption.mock.calls[0];
    expect(checksumCall).toBeDefined();
    const [checksumError] = checksumCall ?? [];
    expect(checksumError).toMatchObject({ reason: "checksum" });
    expect(warnSpy).toHaveBeenCalledWith(
      `${STORAGE_LOG_PREFIX}: storage snapshot corruption detected (checksum)`,
      expect.objectContaining({ reason: "checksum" })
    );

    const backupKey = `${STORAGE_KEY}.backup.${now().replace(/[:.]/g, "-")}`;
    expect(globalThis.localStorage.getItem(backupKey)).toContain("tampered");
  });

  it("persists and reads snapshots when localStorage is unavailable", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("localStorage", undefined);
    const driver = createLocalStorageDriver(STORAGE_KEY);

    expect(driver.load()).toBeNull();

    driver.save(SAMPLE_SNAPSHOT);
    expect(driver.load()).toEqual(SAMPLE_SNAPSHOT);

    driver.clear();
    expect(driver.load()).toBeNull();

    expect(warnSpy).toHaveBeenCalledWith(`${STORAGE_LOG_PREFIX}: localStorage is not available`);
  });

  it("subscribes to storage events and filters by key", () => {
    const driver = createLocalStorageDriver(STORAGE_KEY);
    const callback = vi.fn();
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    const unsubscribe = driver.subscribe(callback);

    expect(addEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    const firstCall = addEventListener.mock.calls[0];
    expect(firstCall).toBeDefined();
    const handler = (firstCall?.[1] as (event: StorageEvent) => void) ?? (() => {});

    handler(new StorageEvent("storage", { key: "other" }));
    expect(callback).not.toHaveBeenCalled();

    handler(new StorageEvent("storage", { key: STORAGE_KEY }));
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(removeEventListener).toHaveBeenCalledWith("storage", handler);
  });

  it("returns a noop unsubscribe when window is unavailable", () => {
    const originalWindow = globalThis.window;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("window", undefined);
    const driver = createLocalStorageDriver(STORAGE_KEY);
    const callback = vi.fn();

    const unsubscribe = driver.subscribe(callback);

    expect(() => unsubscribe()).not.toThrow();
    expect(callback).not.toHaveBeenCalled();

    expect(warnSpy).toHaveBeenCalledWith(`${STORAGE_LOG_PREFIX}: window is not available`);

    if (originalWindow) {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("skips redundant writes when the snapshot is unchanged", () => {
    const setItem = vi.spyOn(globalThis.localStorage, "setItem");
    const driver = createLocalStorageDriver(STORAGE_KEY);

    driver.save(SAMPLE_SNAPSHOT);
    const callsAfterFirstWrite = setItem.mock.calls.length;

    driver.save(SAMPLE_SNAPSHOT);

    expect(setItem.mock.calls.length).toBe(callsAfterFirstWrite);
  });

  it("wraps quota errors in a StorageDriverQuotaError", () => {
    const quotaError = new DOMException("Quota exceeded", "QuotaExceededError");
    const storageMock: Storage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn().mockReturnValue(null),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(() => {
        throw quotaError;
      })
    };
    const getLocalStorageSpy = vi.spyOn(environment, "getLocalStorage").mockReturnValue(storageMock);

    const driver = createLocalStorageDriver(STORAGE_KEY);

    let thrown: unknown;
    try {
      driver.save(SAMPLE_SNAPSHOT);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(StorageDriverQuotaError);

    getLocalStorageSpy.mockRestore();
  });

  it("supports optional encryption hooks", () => {
    const encrypt = vi.fn((payload: string) => `enc:${payload}`);
    const decrypt = vi.fn((payload: string) => payload.replace(/^enc:/, ""));

    const driver = createLocalStorageDriver(STORAGE_KEY, { encrypt, decrypt });
    driver.save(SAMPLE_SNAPSHOT);

    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    expect(stored).toMatch(/^enc:/);
    expect(encrypt).toHaveBeenCalledTimes(1);

    const loaded = driver.load();
    expect(decrypt).toHaveBeenCalledTimes(1);
    expect(loaded).toEqual(SAMPLE_SNAPSHOT);
  });
});
