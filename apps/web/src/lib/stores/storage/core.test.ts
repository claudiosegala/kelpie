import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStorageCore } from "./core";
import { createDefaultConfiguration } from "./defaults";
import { StorageCorruptionError } from "./driver";
import type { StorageDriver } from "./driver";
import {
  AuditEventType,
  HistoryOrigin,
  HistoryScope,
  StorageBroadcastOrigin,
  StorageBroadcastScope,
  type StorageSnapshot
} from "./types";
import { registerMigrationForTesting } from "./migrations";

function createSnapshot(overrides: Partial<StorageSnapshot> = {}): StorageSnapshot {
  const base: StorageSnapshot = {
    meta: {
      version: 1,
      installationId: "test-installation",
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

  return { ...base, ...overrides };
}

describe("createStorageCore", () => {
  let driver: StorageDriver;
  let loadSpy: ReturnType<typeof vi.fn>;
  let saveSpy: ReturnType<typeof vi.fn>;
  let clearSpy: ReturnType<typeof vi.fn>;
  let triggerSubscription: (() => void) | undefined;

  function expectSaveCall(index: number): StorageSnapshot {
    const call = saveSpy.mock.calls[index];
    expect(call).toBeDefined();
    if (!call) {
      throw new Error(`Expected saveSpy call at index ${index}`);
    }
    const [snapshot] = call;
    expect(snapshot).toBeDefined();
    if (!snapshot) {
      throw new Error(`Expected snapshot argument for saveSpy call at index ${index}`);
    }
    return snapshot as StorageSnapshot;
  }

  function expectLastSave(): StorageSnapshot {
    const call = saveSpy.mock.calls.at(-1);
    expect(call).toBeDefined();
    if (!call) {
      throw new Error("Expected saveSpy to have been called at least once");
    }
    const [snapshot] = call;
    expect(snapshot).toBeDefined();
    if (!snapshot) {
      throw new Error("Expected snapshot argument in last saveSpy call");
    }
    return snapshot as StorageSnapshot;
  }

  beforeEach(() => {
    loadSpy = vi.fn();
    saveSpy = vi.fn();
    clearSpy = vi.fn();
    triggerSubscription = undefined;

    driver = {
      load: loadSpy,
      save: saveSpy,
      clear: clearSpy,
      subscribe: vi.fn((callback: () => void) => {
        triggerSubscription = callback;
        return () => {
          triggerSubscription = undefined;
        };
      })
    } satisfies StorageDriver;
  });

  it("hydrates state with the driver's snapshot and refreshes on demand", () => {
    const initialSnapshot = createSnapshot({
      meta: { ...createSnapshot().meta, installationId: "initial" }
    });
    const refreshedSnapshot = createSnapshot({
      meta: { ...createSnapshot().meta, installationId: "refreshed" }
    });

    let current = initialSnapshot;
    loadSpy.mockImplementation(() => current);

    const core = createStorageCore({ driver });
    expect(core.getState().snapshot).toEqual(initialSnapshot);
    expect(core.getState().settings).toEqual(initialSnapshot.settings);

    current = refreshedSnapshot;
    core.refresh();

    expect(loadSpy).toHaveBeenCalledTimes(2);
    expect(core.getState().snapshot).toEqual(refreshedSnapshot);
    expect(core.getState().settings).toEqual(refreshedSnapshot.settings);
  });

  it("falls back to defaults and audits when the driver reports corruption", () => {
    const now = () => "2024-06-01T00:00:00.000Z";
    const corruption = new StorageCorruptionError("parse", "bad payload", "broken");

    loadSpy.mockImplementation((options?: Parameters<StorageDriver["load"]>[0]) => {
      options?.onCorruption?.(corruption);
      return null;
    });

    const core = createStorageCore({ driver, now });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const persisted = expectSaveCall(0);
    expect(persisted.audit.at(-1)).toMatchObject({
      type: AuditEventType.StorageCorruption,
      createdAt: now(),
      metadata: { reason: "parse" }
    });

    expect(core.getState().snapshot).toEqual(persisted);
  });

  it("updates state when the driver notifies of external changes", () => {
    const firstSnapshot = createSnapshot({
      meta: { ...createSnapshot().meta, installationId: "first" }
    });
    const secondSnapshot = createSnapshot({
      meta: { ...createSnapshot().meta, installationId: "second" }
    });

    let current = firstSnapshot;
    loadSpy.mockImplementation(() => current);

    const core = createStorageCore({ driver });
    expect(triggerSubscription).toBeTypeOf("function");

    current = secondSnapshot;
    triggerSubscription?.();

    expect(core.getState().snapshot).toEqual(secondSnapshot);
    expect(core.getState().settings).toEqual(secondSnapshot.settings);
  });

  it("ignores refresh calls when the driver returns null", () => {
    const baseline = createSnapshot();
    loadSpy.mockReturnValueOnce(baseline).mockReturnValueOnce(null);

    const core = createStorageCore({ driver });
    core.refresh();

    expect(core.getState().snapshot).toEqual(baseline);
    expect(core.getState().settings).toEqual(baseline.settings);
  });

  it("resets storage to defaults and persists the new snapshot", () => {
    const broadcastSpy = vi.fn();
    const populated = createSnapshot({
      settings: {
        lastActiveDocumentId: "doc-123",
        panes: { editor: true },
        filters: { status: "open" },
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z"
      },
      index: [
        {
          id: "doc-123",
          title: "Doc",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        }
      ],
      documents: {
        "doc-123": {
          id: "doc-123",
          title: "Doc",
          content: "Hello",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z"
        }
      },
      history: [
        {
          id: "hist-1",
          scope: HistoryScope.Document,
          refId: "doc-123",
          snapshot: {},
          createdAt: "2024-01-02T00:00:00.000Z",
          origin: HistoryOrigin.Api,
          sequence: 1
        }
      ],
      audit: [
        {
          id: "audit-1",
          type: AuditEventType.DocumentUpdated,
          createdAt: "2024-01-02T00:00:00.000Z"
        }
      ]
    });

    loadSpy.mockReturnValue(populated);

    const core = createStorageCore({ driver, broadcast: broadcastSpy });
    core.reset();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const savedSnapshot = expectSaveCall(0);

    expect(savedSnapshot.config).toEqual(createDefaultConfiguration());
    expect(savedSnapshot.index).toEqual([]);
    expect(savedSnapshot.documents).toEqual({});
    expect(savedSnapshot.history).toEqual([]);
    expect(savedSnapshot.audit).toEqual([]);
    expect(savedSnapshot.settings.lastActiveDocumentId).toBeNull();
    expect(savedSnapshot.settings.panes).toEqual({});
    expect(savedSnapshot.settings.filters).toEqual({});

    expect(core.getState().snapshot).toEqual(savedSnapshot);
    expect(core.getState().settings).toEqual(savedSnapshot.settings);
    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: StorageBroadcastScope.Snapshot,
        origin: StorageBroadcastOrigin.Local
      }),
      {
        driver
      }
    );
  });

  it("runs migrations for older snapshots and persists the result", () => {
    const now = () => "2024-03-01T00:00:00.000Z";
    const cleanup = registerMigrationForTesting({
      from: 0,
      to: 1,
      migrate(current) {
        return {
          ...current,
          meta: { ...current.meta, version: 1 },
          config: { ...current.config, historyEntryCap: 42 }
        };
      }
    });

    const baseSnapshot = createSnapshot();
    const legacySnapshot = createSnapshot({
      meta: { ...baseSnapshot.meta, version: 0 },
      config: { ...baseSnapshot.config, historyEntryCap: 10 }
    });

    loadSpy.mockReturnValueOnce(legacySnapshot);

    const core = createStorageCore({ driver, now });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const persisted = expectSaveCall(0);
    expect(persisted.meta.version).toBe(1);
    expect(persisted.meta.migratedFrom).toBe("0");
    expect(persisted.config.historyEntryCap).toBe(42);
    expect(persisted.audit).toHaveLength(1);
    expect(persisted.audit[0]).toMatchObject({
      type: AuditEventType.MigrationCompleted,
      createdAt: now()
    });

    expect(core.getState().snapshot).toEqual(persisted);

    cleanup();
  });

  it("exposes config state that stays in sync with snapshot updates", () => {
    const baseline = createSnapshot({
      config: {
        ...createSnapshot().config,
        debounce: { writeMs: 250, broadcastMs: 125 },
        historyRetentionDays: 14,
        historyEntryCap: 75,
        auditEntryCap: 40,
        softDeleteRetentionDays: 10
      }
    });
    const updated = {
      ...baseline,
      config: {
        ...baseline.config,
        debounce: { writeMs: 1000, broadcastMs: 400 },
        historyRetentionDays: 30,
        historyEntryCap: 120
      }
    } satisfies StorageSnapshot;

    loadSpy.mockReturnValue(baseline);

    const core = createStorageCore({ driver });
    expect(core.getState().config).toEqual(baseline.config);

    const changed = core.update(() => updated);

    expect(changed).toBe(true);
    const savedSnapshot = expectLastSave();
    expect(savedSnapshot.config).toEqual(updated.config);
    expect(savedSnapshot.meta.approxSizeBytes).toBeGreaterThan(0);
    expect(core.getState().config).toEqual(updated.config);
  });

  it("persists updates when the updater returns a new snapshot", () => {
    const broadcastSpy = vi.fn();
    const baseline = createSnapshot();
    const updated = {
      ...baseline,
      settings: {
        ...baseline.settings,
        lastActiveDocumentId: "doc-123",
        updatedAt: "2024-01-03T00:00:00.000Z"
      }
    } satisfies StorageSnapshot;

    loadSpy.mockReturnValue(baseline);

    const core = createStorageCore({ driver, broadcast: broadcastSpy });
    const changed = core.update(() => updated);

    expect(changed).toBe(true);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const savedSnapshot = expectSaveCall(0);
    expect(savedSnapshot.settings).toEqual(updated.settings);
    expect(savedSnapshot.meta.approxSizeBytes).toBeGreaterThan(0);
    expect(core.getState().snapshot).toEqual(savedSnapshot);
    expect(core.getState().settings).toEqual(updated.settings);
    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: StorageBroadcastScope.Snapshot,
        origin: StorageBroadcastOrigin.Local
      }),
      {
        driver
      }
    );
  });

  it("persists document mutations when returning a new snapshot reference", () => {
    const baseline = createSnapshot();
    const nextDocument = {
      id: "doc-123",
      title: "New Doc",
      content: "Hello world",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    } as const;

    loadSpy.mockReturnValue(baseline);

    const core = createStorageCore({ driver });
    const changed = core.update((snapshot) => ({
      ...snapshot,
      index: [
        ...snapshot.index,
        {
          id: nextDocument.id,
          title: nextDocument.title,
          createdAt: nextDocument.createdAt,
          updatedAt: nextDocument.updatedAt,
          deletedAt: null,
          purgeAfter: null
        }
      ],
      documents: {
        ...snapshot.documents,
        [nextDocument.id]: nextDocument
      }
    }));

    expect(changed).toBe(true);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const savedSnapshot = expectSaveCall(0);
    const persisted = savedSnapshot.documents[nextDocument.id];
    expect(persisted).toBeDefined();
    expect(persisted).toEqual(nextDocument);
    expect(savedSnapshot.index).toContainEqual({
      id: nextDocument.id,
      title: nextDocument.title,
      createdAt: nextDocument.createdAt,
      updatedAt: nextDocument.updatedAt,
      deletedAt: null,
      purgeAfter: null
    });
    const stateDoc = core.getState().snapshot.documents[nextDocument.id];
    expect(stateDoc).toBeDefined();
    expect(stateDoc).toEqual(nextDocument);
  });

  it("does not persist when the updater returns the current snapshot", () => {
    const broadcastSpy = vi.fn();
    const baseline = createSnapshot();
    loadSpy.mockReturnValue(baseline);

    const core = createStorageCore({ driver, broadcast: broadcastSpy });
    const changed = core.update((current) => current);

    expect(changed).toBe(false);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(core.getState().snapshot).toEqual(baseline);
    expect(core.getState().settings).toEqual(baseline.settings);
    expect(broadcastSpy).not.toHaveBeenCalled();
  });

  it("throws when the updater does not return a snapshot", () => {
    const baseline = createSnapshot();
    loadSpy.mockReturnValue(baseline);

    const core = createStorageCore({ driver });

    expect(() =>
      core.update(() => {
        return undefined as unknown as StorageSnapshot;
      })
    ).toThrowError("storage.update must return a snapshot");
    expect(core.getState().snapshot).toEqual(baseline);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("updates state for in-place document mutations without persisting", () => {
    const baseline = createSnapshot({
      index: [
        {
          id: "doc-123",
          title: "Doc",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        }
      ],
      documents: {
        "doc-123": {
          id: "doc-123",
          title: "Doc",
          content: "Initial",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z"
        }
      }
    });

    loadSpy.mockReturnValue(baseline);

    const core = createStorageCore({ driver });
    const changed = core.update((snapshot) => {
      const entry = snapshot.index[0];
      const document = snapshot.documents["doc-123"];

      if (!entry || !document) {
        throw new Error("expected seeded document entry");
      }

      entry.title = "Renamed";
      entry.updatedAt = "2024-01-02T00:00:00.000Z";
      document.title = "Renamed";
      document.content = "Updated";
      document.updatedAt = "2024-01-02T00:00:00.000Z";

      return snapshot;
    });

    expect(changed).toBe(false);
    expect(saveSpy).not.toHaveBeenCalled();
    const state = core.getState();
    const entry = state.snapshot.index[0];
    expect(entry).toBeDefined();
    expect(entry).toMatchObject({
      title: "Renamed",
      updatedAt: "2024-01-02T00:00:00.000Z"
    });
    const document = state.snapshot.documents["doc-123"];
    expect(document).toBeDefined();
    expect(document).toMatchObject({
      title: "Renamed",
      content: "Updated",
      updatedAt: "2024-01-02T00:00:00.000Z"
    });
  });

  it("resets the config state to default values", () => {
    const populated = createSnapshot({
      config: {
        ...createSnapshot().config,
        debounce: { writeMs: 50, broadcastMs: 25 },
        historyRetentionDays: 2,
        historyEntryCap: 10,
        auditEntryCap: 5,
        softDeleteRetentionDays: 1
      }
    });

    loadSpy.mockReturnValue(populated);

    const core = createStorageCore({ driver });
    core.reset();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(core.getState().config).toEqual(createDefaultConfiguration());
  });

  it("captures and prunes history entries via the history controller", () => {
    const baseline = createSnapshot({
      config: {
        ...createSnapshot().config,
        historyEntryCap: 2,
        historyRetentionDays: 1,
        debounce: { writeMs: 500, broadcastMs: 200 },
        auditEntryCap: 20,
        softDeleteRetentionDays: 7
      },
      index: [
        {
          id: "doc-123",
          title: "Doc",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        }
      ],
      documents: {
        "doc-123": {
          id: "doc-123",
          title: "Doc",
          content: "Hello",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z"
        }
      },
      history: [
        {
          id: "hist-1",
          scope: HistoryScope.Document,
          refId: "doc-123",
          snapshot: { title: "Doc", content: "Hello" },
          createdAt: "2024-01-01T00:00:00.000Z",
          origin: HistoryOrigin.Api,
          sequence: 1
        }
      ]
    });

    loadSpy.mockReturnValue(baseline);

    const core = createStorageCore({ driver, now: () => "2024-01-03T00:00:00.000Z" });

    const result = core.history.capture({
      scope: HistoryScope.Document,
      refId: "doc-123",
      snapshot: { title: "Doc", content: "Updated" },
      origin: HistoryOrigin.Toolbar
    });

    expect(result.entry.origin).toBe(HistoryOrigin.Toolbar);
    expect(result.entry.sequence).toBe(2);
    expect(result.pruned).toHaveLength(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);

    const snapshot = core.getState().snapshot;
    expect(snapshot.history).toHaveLength(1);
    expect(snapshot.history[0]?.origin).toBe(HistoryOrigin.Toolbar);
    expect(snapshot.audit.at(-1)?.type).toBe(AuditEventType.HistoryPruned);
    expect(core.history.timeline({ scope: HistoryScope.Document, refId: "doc-123" }).cursor?.origin).toBe(
      HistoryOrigin.Toolbar
    );
  });

  it("maintains undo/redo stacks across snapshot updates", () => {
    const baseline = createSnapshot({
      index: [
        {
          id: "doc-123",
          title: "Doc",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        }
      ],
      documents: {
        "doc-123": {
          id: "doc-123",
          title: "Doc",
          content: "Current",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z"
        }
      },
      history: [
        {
          id: "hist-1",
          scope: HistoryScope.Document,
          refId: "doc-123",
          snapshot: { title: "Doc", content: "Initial" },
          createdAt: "2024-01-01T00:00:00.000Z",
          origin: HistoryOrigin.Api,
          sequence: 1
        },
        {
          id: "hist-2",
          scope: HistoryScope.Document,
          refId: "doc-123",
          snapshot: { title: "Doc", content: "Intermediate" },
          createdAt: "2024-01-02T00:00:00.000Z",
          origin: HistoryOrigin.Keyboard,
          sequence: 2
        }
      ]
    });

    loadSpy.mockReturnValue(baseline);

    const core = createStorageCore({ driver, now: () => "2024-01-03T00:00:00.000Z" });

    const undoEntry = core.history.undo(
      { scope: HistoryScope.Document, refId: "doc-123" },
      {
        snapshot: { title: "Doc", content: "Current" },
        origin: HistoryOrigin.Toolbar
      }
    );

    expect(undoEntry?.id).toBe("hist-2");
    if (!undoEntry) {
      throw new Error("expected undo entry to be defined");
    }
    const timelineAfterUndo = core.history.timeline({
      scope: HistoryScope.Document,
      refId: "doc-123"
    });
    expect(timelineAfterUndo.cursor?.id).toBe("hist-1");
    expect(timelineAfterUndo.future).toHaveLength(1);

    core.update((snapshot) => {
      const previous = snapshot.documents["doc-123"];
      if (!previous) {
        throw new Error("expected active document to exist");
      }
      const undoSnapshot = undoEntry.snapshot as { content: string };
      return {
        ...snapshot,
        documents: {
          ...snapshot.documents,
          "doc-123": {
            ...previous,
            content: undoSnapshot.content
          }
        }
      } satisfies StorageSnapshot;
    });

    const redoEntry = core.history.redo({ scope: HistoryScope.Document, refId: "doc-123" });
    expect(redoEntry?.origin).toBe(HistoryOrigin.Toolbar);

    const timelineAfterRedo = core.history.timeline({
      scope: HistoryScope.Document,
      refId: "doc-123"
    });
    expect(timelineAfterRedo.cursor?.id).toBe("hist-2");
    expect(timelineAfterRedo.future).toHaveLength(0);
  });
});
