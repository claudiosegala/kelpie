import { describe, expect, it } from "vitest";
import { runMigrations } from "./migrations";
import type { StorageMigration } from "./migrations";
import { AuditEventType, type StorageSnapshot } from "./types";

function createSnapshot(overrides: Partial<StorageSnapshot> = {}): StorageSnapshot {
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
      auditEntryCap: 20,
      softDeleteRetentionDays: 7,
      quotaWarningBytes: 1_000,
      quotaHardLimitBytes: 5_000,
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

  return { ...base, ...overrides };
}

describe("runMigrations", () => {
  it("returns the snapshot unchanged when already at the target version", () => {
    const snapshot = createSnapshot();
    const result = runMigrations(snapshot, 1);

    expect(result.applied).toHaveLength(0);
    expect(result.snapshot).toBe(snapshot);
  });

  it("applies migrations sequentially and appends an audit entry", () => {
    const now = () => "2024-02-01T00:00:00.000Z";
    const migrations: StorageMigration[] = [
      {
        from: 0,
        to: 1,
        migrate(current) {
          return {
            ...current,
            meta: { ...current.meta, version: 1 },
            config: { ...current.config, historyEntryCap: 99 }
          };
        }
      },
      {
        from: 1,
        to: 2,
        migrate(current) {
          return {
            ...current,
            meta: { ...current.meta, version: 2 },
            settings: { ...current.settings, updatedAt: "2024-02-01T00:00:00.000Z" }
          };
        }
      }
    ];

    const base = createSnapshot();
    const initial = createSnapshot({ meta: { ...base.meta, version: 0 } });
    const result = runMigrations(initial, 2, { migrations, now });

    expect(result.applied).toHaveLength(2);
    expect(result.snapshot.meta.version).toBe(2);
    expect(result.snapshot.meta.migratedFrom).toBe("0");
    expect(result.snapshot.config.historyEntryCap).toBe(99);
    expect(result.snapshot.audit).toHaveLength(1);
    expect(result.snapshot.audit[0]).toMatchObject({
      type: AuditEventType.MigrationCompleted,
      createdAt: now(),
      metadata: {
        from: 0,
        to: 2,
        steps: [
          { from: 0, to: 1 },
          { from: 1, to: 2 }
        ]
      }
    });
  });

  it("throws when a required migration step is missing", () => {
    const migrations: StorageMigration[] = [
      {
        from: 0,
        to: 1,
        migrate(current) {
          return {
            ...current,
            meta: { ...current.meta, version: 1 }
          };
        }
      }
    ];

    const base = createSnapshot();
    const snapshot = createSnapshot({ meta: { ...base.meta, version: 0 } });

    expect(() => runMigrations(snapshot, 2, { migrations })).toThrow(/missing migration step from version 1/);
  });

  it("throws when the snapshot version is newer than the target", () => {
    const base = createSnapshot();
    const snapshot = createSnapshot({ meta: { ...base.meta, version: 5 } });

    expect(() => runMigrations(snapshot, 2)).toThrow(/snapshot version 5 is newer than supported version 2/);
  });
});
