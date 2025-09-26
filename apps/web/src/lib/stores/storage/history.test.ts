import { describe, expect, it } from "vitest";
import { captureHistorySnapshot, createHistoryCache, getHistoryTimeline, redoHistory, undoHistory } from "./history";
import type { HistoryEntry, StorageSnapshot } from "./types";

const BASE_CONFIG = {
  debounce: { writeMs: 500, broadcastMs: 200 },
  historyRetentionDays: 7,
  historyEntryCap: 50,
  auditEntryCap: 20,
  softDeleteRetentionDays: 7
} as const;

const BASE_SETTINGS = {
  lastActiveDocumentId: "doc-1",
  panes: {},
  filters: {},
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
} as const;

const BASE_INDEX = [
  {
    id: "doc-1",
    title: "Doc",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
    purgeAfter: null
  }
] as const;

const BASE_DOCUMENTS = {
  "doc-1": {
    id: "doc-1",
    title: "Doc",
    content: "Hello",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
  }
} as const;

function createSnapshot(overrides: Partial<StorageSnapshot> = {}): StorageSnapshot {
  return {
    meta: {
      version: 1,
      installationId: "test-installation",
      createdAt: "2024-01-01T00:00:00.000Z",
      lastOpenedAt: "2024-01-01T00:00:00.000Z",
      ...(overrides.meta ?? {})
    },
    config: { ...BASE_CONFIG, ...(overrides.config ?? {}) },
    settings: { ...BASE_SETTINGS, ...(overrides.settings ?? {}) },
    index: overrides.index ?? [...BASE_INDEX],
    documents: overrides.documents ?? { ...BASE_DOCUMENTS },
    history: overrides.history ?? [],
    audit: overrides.audit ?? []
  } satisfies StorageSnapshot;
}

describe("history utilities", () => {
  it("captures history entries with sequential sequence values", () => {
    const snapshot = createSnapshot();

    const { snapshot: nextSnapshot, entry } = captureHistorySnapshot(
      snapshot,
      {
        scope: "document",
        refId: "doc-1",
        snapshot: { title: "Doc", content: "Hello" },
        origin: "api"
      },
      { now: () => "2024-01-02T00:00:00.000Z" }
    );

    expect(entry.sequence).toBe(1);
    expect(nextSnapshot.history).toHaveLength(1);
    expect((nextSnapshot.history[0] as HistoryEntry).origin).toBe("api");
  });

  it("prunes entries outside the retention window and records an audit entry", () => {
    const snapshot = createSnapshot({
      config: {
        ...BASE_CONFIG,
        historyRetentionDays: 1,
        historyEntryCap: 10,
        debounce: { writeMs: 500, broadcastMs: 200 },
        auditEntryCap: 20,
        softDeleteRetentionDays: 7
      },
      history: [
        {
          id: "hist-old",
          scope: "document",
          refId: "doc-1",
          snapshot: { title: "Doc" },
          createdAt: "2024-01-01T00:00:00.000Z",
          origin: "api",
          sequence: 1
        }
      ]
    });

    const {
      snapshot: nextSnapshot,
      pruned,
      auditEntry
    } = captureHistorySnapshot(
      snapshot,
      {
        scope: "document",
        refId: "doc-1",
        snapshot: { title: "Doc", content: "Hello" },
        origin: "toolbar"
      },
      { now: () => "2024-01-03T00:00:00.000Z" }
    );

    expect(pruned).toHaveLength(1);
    expect(nextSnapshot.history).toHaveLength(1);
    expect(nextSnapshot.history[0]?.origin).toBe("toolbar");
    expect(auditEntry).not.toBeNull();
    expect(auditEntry?.type).toBe("history.pruned");
    expect(auditEntry?.metadata).toMatchObject({ count: 1 });
  });

  it("caps audit entries when recording history pruning metadata", () => {
    const snapshot = createSnapshot({
      config: {
        ...BASE_CONFIG,
        historyRetentionDays: 1,
        auditEntryCap: 1
      },
      audit: [
        {
          id: "audit-old",
          type: "document.created",
          createdAt: "2024-01-01T00:00:00.000Z",
          metadata: { id: "doc-1" }
        }
      ],
      history: [
        {
          id: "hist-old",
          scope: "document",
          refId: "doc-1",
          snapshot: { title: "Doc" },
          createdAt: "2024-01-01T00:00:00.000Z",
          origin: "api",
          sequence: 1
        }
      ]
    });

    const { snapshot: nextSnapshot } = captureHistorySnapshot(
      snapshot,
      {
        scope: "document",
        refId: "doc-1",
        snapshot: { title: "Doc", content: "Hello" },
        origin: "toolbar"
      },
      { now: () => "2024-01-05T00:00:00.000Z" }
    );

    expect(nextSnapshot.audit).toHaveLength(1);
    expect(nextSnapshot.audit[0]?.type).toBe("history.pruned");
  });

  it("enforces the history entry cap", () => {
    const snapshot = createSnapshot({
      config: {
        ...BASE_CONFIG,
        historyEntryCap: 2,
        debounce: { writeMs: 500, broadcastMs: 200 },
        auditEntryCap: 20,
        softDeleteRetentionDays: 7,
        historyRetentionDays: 30
      },
      history: [
        {
          id: "hist-1",
          scope: "document",
          refId: "doc-1",
          snapshot: { title: "Doc" },
          createdAt: "2024-01-02T00:00:00.000Z",
          origin: "api",
          sequence: 1
        },
        {
          id: "hist-2",
          scope: "document",
          refId: "doc-1",
          snapshot: { title: "Doc", content: "Updated" },
          createdAt: "2024-01-03T00:00:00.000Z",
          origin: "keyboard",
          sequence: 2
        }
      ]
    });

    const { snapshot: nextSnapshot, pruned } = captureHistorySnapshot(
      snapshot,
      {
        scope: "document",
        refId: "doc-1",
        snapshot: { title: "Doc", content: "Latest" },
        origin: "toolbar"
      },
      { now: () => "2024-01-04T00:00:00.000Z" }
    );

    expect(nextSnapshot.history).toHaveLength(2);
    expect(pruned[0]?.id).toBe("hist-1");
    expect(nextSnapshot.history[0]?.id).toBe("hist-2");
    expect(nextSnapshot.history[1]?.origin).toBe("toolbar");
  });

  it("supports undo/redo timelines per document", () => {
    const snapshot = createSnapshot({
      history: [
        {
          id: "hist-1",
          scope: "document",
          refId: "doc-1",
          snapshot: { title: "Doc", content: "Initial" },
          createdAt: "2024-01-02T00:00:00.000Z",
          origin: "api",
          sequence: 1
        },
        {
          id: "hist-2",
          scope: "document",
          refId: "doc-1",
          snapshot: { title: "Doc", content: "Updated" },
          createdAt: "2024-01-03T00:00:00.000Z",
          origin: "keyboard",
          sequence: 2
        }
      ]
    });

    const cache = createHistoryCache(snapshot);
    const timelineBefore = getHistoryTimeline(cache, { scope: "document", refId: "doc-1" });
    expect(timelineBefore.cursor?.id).toBe("hist-2");
    expect(timelineBefore.past).toHaveLength(1);

    const undoResult = undoHistory(
      cache,
      { scope: "document", refId: "doc-1" },
      {
        snapshot: { title: "Doc", content: "New" },
        origin: "toolbar"
      },
      { now: () => "2024-01-04T00:00:00.000Z" }
    );

    expect(undoResult.entry?.id).toBe("hist-2");

    const afterUndo = getHistoryTimeline(cache, { scope: "document", refId: "doc-1" });
    expect(afterUndo.cursor?.id).toBe("hist-1");
    expect(afterUndo.future[0]?.origin).toBe("toolbar");

    const redoResult = redoHistory(cache, { scope: "document", refId: "doc-1" });
    expect(redoResult.entry?.origin).toBe("toolbar");

    const afterRedo = getHistoryTimeline(cache, { scope: "document", refId: "doc-1" });
    expect(afterRedo.cursor?.id).toBe("hist-2");
    expect(afterRedo.future).toHaveLength(0);
    expect(afterRedo.past[0]?.id).toBe("hist-1");
  });

  it("returns null when undoing without history", () => {
    const cache = createHistoryCache(createSnapshot());
    const { entry } = undoHistory(cache, { scope: "document", refId: "doc-1" }, { snapshot: {}, origin: "api" });
    expect(entry).toBeNull();
  });

  it("validates history captures for unknown documents", () => {
    const snapshot = createSnapshot();
    expect(() =>
      captureHistorySnapshot(
        snapshot,
        {
          scope: "document",
          refId: "missing",
          snapshot: {},
          origin: "api"
        },
        { now: () => "2024-01-02T00:00:00.000Z" }
      )
    ).toThrowError("unknown document id 'missing' for history capture");
  });

  it("validates settings history ref ids", () => {
    const snapshot = createSnapshot();
    expect(() =>
      captureHistorySnapshot(
        snapshot,
        {
          scope: "settings",
          refId: "doc-1",
          snapshot: {},
          origin: "api"
        },
        { now: () => "2024-01-02T00:00:00.000Z" }
      )
    ).toThrowError("settings history entries must target the 'settings' refId");
  });
});
