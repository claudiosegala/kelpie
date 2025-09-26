import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultConfiguration, createDefaultSettings, createInitialSnapshot } from "./defaults";
import {
  DEFAULT_AUDIT_ENTRY_CAP,
  DEFAULT_DEBOUNCE_BROADCAST_MS,
  DEFAULT_DEBOUNCE_WRITE_MS,
  DEFAULT_GC_IDLE_TRIGGER_MS,
  DEFAULT_HISTORY_ENTRY_CAP,
  DEFAULT_HISTORY_RETENTION_DAYS,
  DEFAULT_QUOTA_HARD_LIMIT_BYTES,
  DEFAULT_QUOTA_WARNING_BYTES,
  DEFAULT_SOFT_DELETE_RETENTION_DAYS,
  STORAGE_SCHEMA_VERSION
} from "./constants";

type CryptoLike = { randomUUID: () => string };

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("storage defaults", () => {
  it("builds runtime configuration from constant defaults", () => {
    expect(createDefaultConfiguration()).toEqual({
      debounce: {
        writeMs: DEFAULT_DEBOUNCE_WRITE_MS,
        broadcastMs: DEFAULT_DEBOUNCE_BROADCAST_MS
      },
      historyRetentionDays: DEFAULT_HISTORY_RETENTION_DAYS,
      historyEntryCap: DEFAULT_HISTORY_ENTRY_CAP,
      auditEntryCap: DEFAULT_AUDIT_ENTRY_CAP,
      enableAudit: true,
      redactAuditMetadata: false,
      softDeleteRetentionDays: DEFAULT_SOFT_DELETE_RETENTION_DAYS,
      quotaWarningBytes: DEFAULT_QUOTA_WARNING_BYTES,
      quotaHardLimitBytes: DEFAULT_QUOTA_HARD_LIMIT_BYTES,
      gcIdleTriggerMs: DEFAULT_GC_IDLE_TRIGGER_MS
    });
  });

  it("initializes UI settings with matching timestamps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-08-01T08:15:30Z"));

    const settings = createDefaultSettings();

    expect(settings).toEqual({
      lastActiveDocumentId: null,
      panes: {},
      filters: {},
      createdAt: "2024-08-01T08:15:30.000Z",
      updatedAt: "2024-08-01T08:15:30.000Z"
    });
  });

  it("produces a versioned snapshot with generated installation id", () => {
    vi.useFakeTimers();
    const now = new Date("2024-07-15T09:30:00Z");
    vi.setSystemTime(now);

    const randomUUID = vi.fn().mockReturnValue("uuid-test-123");
    vi.stubGlobal("crypto", { randomUUID } satisfies CryptoLike);
    const snapshot = createInitialSnapshot();

    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(snapshot.meta).toEqual({
      version: STORAGE_SCHEMA_VERSION,
      installationId: "uuid-test-123",
      createdAt: now.toISOString(),
      lastOpenedAt: now.toISOString(),
      approxSizeBytes: expect.any(Number)
    });
    expect(snapshot.config).toEqual(createDefaultConfiguration());
    expect(snapshot.settings).toEqual(createDefaultSettings());
    expect(snapshot.index).toEqual([]);
    expect(snapshot.documents).toEqual({});
    expect(snapshot.history).toEqual([]);
    expect(snapshot.audit).toEqual([]);
  });

  it("falls back to Math.random when crypto.randomUUID is unavailable", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-05-20T18:45:00Z"));

    vi.stubGlobal("crypto", undefined);

    const randomValue = 0.4242424242;
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(randomValue);

    const snapshot = createInitialSnapshot();

    expect(randomSpy).toHaveBeenCalledTimes(1);
    const expectedId = randomValue.toString(36).slice(2);
    expect(snapshot.meta.installationId).toBe(expectedId);
  });
});
