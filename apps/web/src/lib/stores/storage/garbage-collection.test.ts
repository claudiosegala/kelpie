import { describe, expect, it } from "vitest";
import { createInitialSnapshot } from "./defaults";
import { normaliseSnapshotForPersistence, StorageQuotaError } from "./garbage-collection";
import type { StorageSnapshot } from "./types";

function baseSnapshot(overrides: Partial<StorageSnapshot> = {}): StorageSnapshot {
  const snapshot = createInitialSnapshot();
  return {
    ...snapshot,
    ...overrides,
    config: {
      ...snapshot.config,
      ...(overrides.config ?? {})
    },
    settings: {
      ...snapshot.settings,
      ...(overrides.settings ?? {})
    },
    meta: {
      ...snapshot.meta,
      ...(overrides.meta ?? {})
    }
  } satisfies StorageSnapshot;
}

describe("normaliseSnapshotForPersistence", () => {
  it("purges expired documents and associated history", () => {
    const snapshot = baseSnapshot({
      config: {
        ...createInitialSnapshot().config,
        quotaWarningBytes: 50_000,
        quotaHardLimitBytes: 100_000
      },
      settings: {
        ...createInitialSnapshot().settings,
        lastActiveDocumentId: "doc-2"
      },
      index: [
        {
          id: "doc-1",
          title: "Old",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-02-01T00:00:00.000Z",
          deletedAt: "2024-02-02T00:00:00.000Z",
          purgeAfter: "2024-02-05T00:00:00.000Z"
        },
        {
          id: "doc-2",
          title: "Active",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-02-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        }
      ],
      documents: {
        "doc-1": {
          id: "doc-1",
          title: "Old",
          content: "Legacy",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-02-01T00:00:00.000Z"
        },
        "doc-2": {
          id: "doc-2",
          title: "Active",
          content: "Latest",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-02-01T00:00:00.000Z"
        }
      },
      history: [
        {
          id: "hist-1",
          scope: "document",
          refId: "doc-1",
          snapshot: { title: "Old" },
          createdAt: "2024-02-01T00:00:00.000Z",
          origin: "api",
          sequence: 1
        },
        {
          id: "hist-2",
          scope: "document",
          refId: "doc-2",
          snapshot: { title: "Active" },
          createdAt: "2024-02-01T01:00:00.000Z",
          origin: "api",
          sequence: 2
        }
      ]
    });

    const { snapshot: result } = normaliseSnapshotForPersistence(snapshot, {
      now: () => "2024-02-10T00:00:00.000Z"
    });

    expect(result.index.map((entry) => entry.id)).toEqual(["doc-2"]);
    expect(result.documents).not.toHaveProperty("doc-1");
    expect(result.history.map((entry) => entry.id)).toEqual(["hist-2"]);
    expect(result.audit.at(-2)).toMatchObject({ type: "document.purged" });
    expect(result.audit.at(-1)).toMatchObject({ type: "history.pruned", metadata: { reason: "documentPurged" } });
    expect(result.meta.approxSizeBytes).toBeGreaterThan(0);
  });

  it("trims history entries until the snapshot fits under the warning threshold", () => {
    const snapshot = baseSnapshot({
      config: {
        ...createInitialSnapshot().config,
        quotaWarningBytes: 600,
        quotaHardLimitBytes: 5_000
      },
      history: [
        {
          id: "hist-1",
          scope: "document",
          refId: "doc-1",
          snapshot: { content: "x".repeat(600) },
          createdAt: "2024-02-01T00:00:00.000Z",
          origin: "api",
          sequence: 1
        },
        {
          id: "hist-2",
          scope: "document",
          refId: "doc-1",
          snapshot: { content: "x".repeat(600) },
          createdAt: "2024-02-01T01:00:00.000Z",
          origin: "api",
          sequence: 2
        }
      ]
    });

    const { snapshot: result } = normaliseSnapshotForPersistence(snapshot, {
      now: () => "2024-02-10T00:00:00.000Z"
    });

    expect(result.history).toHaveLength(0);
    const prunedEntry = result.audit.find(
      (entry) => entry.type === "history.pruned" && entry.metadata?.reason === "quota"
    );
    expect(prunedEntry).toBeDefined();
  });

  it("emits a quota warning when the snapshot remains over the warning threshold", () => {
    const snapshot = baseSnapshot({
      config: {
        ...createInitialSnapshot().config,
        quotaWarningBytes: 100,
        quotaHardLimitBytes: 5_000
      },
      documents: {
        "doc-1": {
          id: "doc-1",
          title: "Large",
          content: "y".repeat(400),
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-02-01T00:00:00.000Z"
        }
      },
      index: [
        {
          id: "doc-1",
          title: "Large",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-02-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        }
      ],
      history: []
    });

    const { snapshot: result } = normaliseSnapshotForPersistence(snapshot, {
      now: () => "2024-02-10T00:00:00.000Z"
    });

    expect(result.audit.at(-1)).toMatchObject({ type: "storage.quota.warning" });
    expect(result.meta.approxSizeBytes).toBeGreaterThan(result.config.quotaWarningBytes);
  });

  it("throws when the snapshot exceeds the hard limit after garbage collection", () => {
    const snapshot = baseSnapshot({
      config: {
        ...createInitialSnapshot().config,
        quotaWarningBytes: 100,
        quotaHardLimitBytes: 200
      },
      documents: {
        "doc-1": {
          id: "doc-1",
          title: "Huge",
          content: "z".repeat(800),
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-02-01T00:00:00.000Z"
        }
      },
      index: [
        {
          id: "doc-1",
          title: "Huge",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-02-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        }
      ],
      history: []
    });

    expect(() =>
      normaliseSnapshotForPersistence(snapshot, {
        now: () => "2024-02-10T00:00:00.000Z"
      })
    ).toThrow(StorageQuotaError);
  });
});
