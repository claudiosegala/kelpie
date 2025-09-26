import { describe, expect, it } from "vitest";
import { appendAuditEntries, createAuditEntry } from "./audit";
import type { StorageSnapshot } from "./types";

type SnapshotOverrides = Partial<Omit<StorageSnapshot, "config">> & {
  config?: Partial<StorageSnapshot["config"]>;
};

function createSnapshot(overrides: SnapshotOverrides = {}): StorageSnapshot {
  const base: StorageSnapshot = {
    meta: {
      version: 1,
      installationId: "install",
      createdAt: "2024-01-01T00:00:00.000Z",
      lastOpenedAt: "2024-01-01T00:00:00.000Z",
      approxSizeBytes: 0
    },
    config: {
      debounce: { writeMs: 500, broadcastMs: 200 },
      historyRetentionDays: 7,
      historyEntryCap: 50,
      auditEntryCap: 10,
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

  return {
    ...base,
    ...overrides,
    config: { ...base.config, ...(overrides.config ?? {}) },
    audit: overrides.audit ?? base.audit
  } satisfies StorageSnapshot;
}

describe("appendAuditEntries", () => {
  it("skips audit writes when auditing is disabled", () => {
    const snapshot = createSnapshot({ config: { enableAudit: false } });
    const entry = createAuditEntry("storage.reset", "2024-01-02T00:00:00.000Z");

    const next = appendAuditEntries(snapshot, entry);

    expect(next).toEqual([]);
  });

  it("redacts metadata when configured", () => {
    const snapshot = createSnapshot({
      config: { redactAuditMetadata: true },
      audit: [createAuditEntry("document.updated", "2024-01-01T00:00:00.000Z", { original: true })]
    });

    const entry = createAuditEntry("storage.reset", "2024-01-02T00:00:00.000Z", { details: "secret" });

    const next = appendAuditEntries(snapshot, entry);

    const stored = next.at(-1);
    expect(stored).toMatchObject({ type: "storage.reset" });
    expect(stored?.metadata).toBeUndefined();
  });
});
