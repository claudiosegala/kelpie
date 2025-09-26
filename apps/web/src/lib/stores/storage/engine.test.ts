import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { createStorageEngine } from "./engine";
import type { StorageDriver } from "./driver";
import type { StorageSnapshot } from "./types";

function createSnapshot(): StorageSnapshot {
  return {
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
}

describe("createStorageEngine", () => {
  let driver: StorageDriver;
  let loadSpy: ReturnType<typeof vi.fn>;
  let saveSpy: ReturnType<typeof vi.fn>;
  let triggerSubscription: (() => void) | undefined;

  beforeEach(() => {
    loadSpy = vi.fn();
    saveSpy = vi.fn();
    triggerSubscription = undefined;

    driver = {
      load: loadSpy,
      save: saveSpy,
      clear: vi.fn(),
      subscribe: vi.fn((callback: () => void) => {
        triggerSubscription = callback;
        return () => {
          triggerSubscription = undefined;
        };
      })
    } satisfies StorageDriver;
  });

  it("exposes writable stores that mirror the core state", () => {
    const initial = createSnapshot();
    const next = {
      ...initial,
      settings: {
        ...initial.settings,
        lastActiveDocumentId: "doc-1",
        updatedAt: "2024-01-02T00:00:00.000Z"
      }
    } satisfies StorageSnapshot;

    loadSpy.mockReturnValue(initial);

    const engine = createStorageEngine({ driver });
    expect(get(engine.snapshot)).toEqual(initial);
    expect(get(engine.config)).toEqual(initial.config);
    expect(get(engine.settings)).toEqual(initial.settings);

    engine.update(() => next);

    const snapshotValue = get(engine.snapshot);
    expect(snapshotValue).toMatchObject({
      ...next,
      meta: expect.objectContaining({
        installationId: next.meta.installationId,
        createdAt: next.meta.createdAt,
        lastOpenedAt: next.meta.lastOpenedAt,
        version: next.meta.version,
        approxSizeBytes: expect.any(Number)
      })
    });
    expect(get(engine.config)).toEqual(next.config);
    expect(get(engine.settings)).toEqual(next.settings);
    const savedSnapshot = saveSpy.mock.calls.at(-1)?.[0] as StorageSnapshot;
    expect(savedSnapshot.settings).toEqual(next.settings);
    expect(savedSnapshot.meta.approxSizeBytes).toBeGreaterThan(0);
  });

  it("refreshes Svelte stores when external driver updates occur", () => {
    const first = createSnapshot();
    const second = {
      ...first,
      config: {
        ...first.config,
        historyEntryCap: 10
      }
    } satisfies StorageSnapshot;

    let current = first;
    loadSpy.mockImplementation(() => current);

    const engine = createStorageEngine({ driver });
    expect(triggerSubscription).toBeTypeOf("function");

    current = second;
    triggerSubscription?.();

    expect(get(engine.snapshot)).toEqual(second);
    expect(get(engine.config)).toEqual(second.config);
  });

  it("keeps stores in sync with history captures", () => {
    const baseline = {
      ...createSnapshot(),
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
      }
    } satisfies StorageSnapshot;

    loadSpy.mockReturnValue(baseline);

    const engine = createStorageEngine({ driver, now: () => "2024-01-03T00:00:00.000Z" });

    engine.history.capture({
      scope: "document",
      refId: "doc-123",
      snapshot: { title: "Doc", content: "Updated" },
      origin: "toolbar"
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(get(engine.snapshot).history).toHaveLength(1);
    expect(get(engine.snapshot).history[0]?.origin).toBe("toolbar");
  });
});
