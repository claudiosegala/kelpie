import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalStorageDriver } from "./driver";
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

  it("returns null when the stored payload cannot be parsed", () => {
    const driver = createLocalStorageDriver(STORAGE_KEY);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.localStorage.setItem(STORAGE_KEY, "not-json");

    expect(driver.load()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith("Kelpie storage: failed to parse snapshot", expect.any(SyntaxError));
  });

  it("no-ops when localStorage is unavailable", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("localStorage", undefined);
    const driver = createLocalStorageDriver(STORAGE_KEY);

    expect(driver.load()).toBeNull();

    expect(() => driver.save(SAMPLE_SNAPSHOT)).not.toThrow();
    expect(() => driver.clear()).not.toThrow();

    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalledWith("Kelpie storage: localStorage is not available");
  });

  it("subscribes to storage events and filters by key", () => {
    const driver = createLocalStorageDriver(STORAGE_KEY);
    const callback = vi.fn();
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    const unsubscribe = driver.subscribe(callback);

    expect(addEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    const handler = addEventListener.mock.calls[0][1] as (event: StorageEvent) => void;

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

    expect(warnSpy).toHaveBeenCalledWith("Kelpie storage: window is not available");

    if (originalWindow) {
      vi.stubGlobal("window", originalWindow);
    }
  });
});
