import { describe, expect, it, vi, beforeEach } from "vitest";
import { get } from "svelte/store";
import { createStorageEngine } from "./engine";
import type { StorageDriver } from "./driver";
import type { StorageSnapshot } from "./types";
import { createDefaultConfiguration } from "./defaults";

function createSnapshot(overrides: Partial<StorageSnapshot> = {}): StorageSnapshot {
  const base: StorageSnapshot = {
    meta: {
      version: 1,
      installationId: "test-installation",
      createdAt: "2024-01-01T00:00:00.000Z",
      lastOpenedAt: "2024-01-01T00:00:00.000Z"
    },
    config: {
      debounce: { writeMs: 500, broadcastMs: 200 },
      historyRetentionDays: 7,
      historyEntryCap: 50,
      auditEntryCap: 20,
      softDeleteRetentionDays: 7
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

describe("createStorageEngine", () => {
  let driver: StorageDriver;
  let loadSpy: ReturnType<typeof vi.fn>;
  let saveSpy: ReturnType<typeof vi.fn>;
  let clearSpy: ReturnType<typeof vi.fn>;
  let triggerSubscription: (() => void) | undefined;

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

  it("hydrates stores with the driver's snapshot and refreshes them on demand", () => {
    const initialSnapshot = createSnapshot({
      meta: { ...createSnapshot().meta, installationId: "initial" }
    });
    const refreshedSnapshot = createSnapshot({
      meta: { ...createSnapshot().meta, installationId: "refreshed" }
    });

    let current = initialSnapshot;
    loadSpy.mockImplementation(() => current);

    const engine = createStorageEngine({ driver });
    expect(get(engine.snapshot)).toEqual(initialSnapshot);
    expect(get(engine.settings)).toEqual(initialSnapshot.settings);

    current = refreshedSnapshot;
    engine.refresh();

    expect(loadSpy).toHaveBeenCalledTimes(2);
    expect(get(engine.snapshot)).toEqual(refreshedSnapshot);
    expect(get(engine.settings)).toEqual(refreshedSnapshot.settings);
  });

  it("updates stores when the driver notifies of external changes", () => {
    const firstSnapshot = createSnapshot({
      meta: { ...createSnapshot().meta, installationId: "first" }
    });
    const secondSnapshot = createSnapshot({
      meta: { ...createSnapshot().meta, installationId: "second" }
    });

    let current = firstSnapshot;
    loadSpy.mockImplementation(() => current);

    const engine = createStorageEngine({ driver });
    expect(triggerSubscription).toBeTypeOf("function");

    current = secondSnapshot;
    triggerSubscription?.();

    expect(get(engine.snapshot)).toEqual(secondSnapshot);
    expect(get(engine.settings)).toEqual(secondSnapshot.settings);
  });

  it("ignores refresh calls when the driver returns null", () => {
    const baseline = createSnapshot();
    loadSpy.mockReturnValueOnce(baseline).mockReturnValueOnce(null);

    const engine = createStorageEngine({ driver });
    engine.refresh();

    expect(get(engine.snapshot)).toEqual(baseline);
    expect(get(engine.settings)).toEqual(baseline.settings);
  });

  it("resets storage to defaults and persists the new snapshot", () => {
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
          scope: "document",
          refId: "doc-123",
          snapshot: {},
          createdAt: "2024-01-02T00:00:00.000Z"
        }
      ],
      audit: [
        {
          id: "audit-1",
          type: "document.updated",
          createdAt: "2024-01-02T00:00:00.000Z"
        }
      ]
    });

    loadSpy.mockReturnValue(populated);

    const engine = createStorageEngine({ driver });
    engine.reset();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const savedSnapshot = saveSpy.mock.calls[0][0] as StorageSnapshot;

    expect(savedSnapshot.config).toEqual(createDefaultConfiguration());
    expect(savedSnapshot.index).toEqual([]);
    expect(savedSnapshot.documents).toEqual({});
    expect(savedSnapshot.history).toEqual([]);
    expect(savedSnapshot.audit).toEqual([]);
    expect(savedSnapshot.settings.lastActiveDocumentId).toBeNull();
    expect(savedSnapshot.settings.panes).toEqual({});
    expect(savedSnapshot.settings.filters).toEqual({});

    expect(get(engine.snapshot)).toEqual(savedSnapshot);
    expect(get(engine.settings)).toEqual(savedSnapshot.settings);
  });

  it("exposes a config store that stays in sync with snapshot updates", () => {
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

    const engine = createStorageEngine({ driver });
    expect(get(engine.config)).toEqual(baseline.config);

    const changed = engine.update(() => updated);

    expect(changed).toBe(true);
    expect(saveSpy).toHaveBeenCalledWith(updated);
    expect(get(engine.config)).toEqual(updated.config);
  });

  it("persists updates when the updater returns a new snapshot", () => {
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

    const engine = createStorageEngine({ driver });
    const changed = engine.update(() => updated);

    expect(changed).toBe(true);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(updated);
    expect(get(engine.snapshot)).toEqual(updated);
    expect(get(engine.settings)).toEqual(updated.settings);
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

    const engine = createStorageEngine({ driver });
    const changed = engine.update((snapshot) => ({
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
    const savedSnapshot = saveSpy.mock.calls[0][0] as StorageSnapshot;
    expect(savedSnapshot.documents[nextDocument.id]).toEqual(nextDocument);
    expect(savedSnapshot.index).toContainEqual({
      id: nextDocument.id,
      title: nextDocument.title,
      createdAt: nextDocument.createdAt,
      updatedAt: nextDocument.updatedAt,
      deletedAt: null,
      purgeAfter: null
    });
    expect(get(engine.snapshot).documents[nextDocument.id]).toEqual(nextDocument);
  });

  it("does not persist when the updater returns the current snapshot", () => {
    const baseline = createSnapshot();
    loadSpy.mockReturnValue(baseline);

    const engine = createStorageEngine({ driver });
    const changed = engine.update((current) => current);

    expect(changed).toBe(false);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(get(engine.snapshot)).toEqual(baseline);
    expect(get(engine.settings)).toEqual(baseline.settings);
  });

  it("throws when the updater does not return a snapshot", () => {
    const baseline = createSnapshot();
    loadSpy.mockReturnValue(baseline);

    const engine = createStorageEngine({ driver });

    expect(() =>
      engine.update(() => {
        return undefined as unknown as StorageSnapshot;
      })
    ).toThrowError("storage.update must return a snapshot");
    expect(get(engine.snapshot)).toEqual(baseline);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("updates stores for in-place document mutations without persisting", () => {
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

    const engine = createStorageEngine({ driver });
    const changed = engine.update((snapshot) => {
      const entry = snapshot.index[0];
      const document = snapshot.documents["doc-123"];

      entry.title = "Renamed";
      entry.updatedAt = "2024-01-02T00:00:00.000Z";
      document.title = "Renamed";
      document.content = "Updated";
      document.updatedAt = "2024-01-02T00:00:00.000Z";

      return snapshot;
    });

    expect(changed).toBe(false);
    expect(saveSpy).not.toHaveBeenCalled();
    const snapshot = get(engine.snapshot);
    expect(snapshot.index[0]).toMatchObject({
      title: "Renamed",
      updatedAt: "2024-01-02T00:00:00.000Z"
    });
    expect(snapshot.documents["doc-123"]).toMatchObject({
      title: "Renamed",
      content: "Updated",
      updatedAt: "2024-01-02T00:00:00.000Z"
    });
  });

  it("resets the config store to default values", () => {
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

    const engine = createStorageEngine({ driver });
    engine.reset();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(get(engine.config)).toEqual(createDefaultConfiguration());
  });
});
