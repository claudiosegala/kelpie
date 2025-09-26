import { STORAGE_SCHEMA_VERSION } from "./constants";
import { createDefaultConfiguration, createInitialSnapshot } from "./defaults";
import type { StorageDriver } from "./driver";
import {
  captureHistorySnapshot,
  createHistoryCache,
  getHistoryTimeline,
  redoHistory,
  undoHistory,
  type HistoryCache,
  type HistoryCaptureInput,
  type HistoryCaptureResult,
  type HistoryTarget,
  type HistoryTimelineView,
  type HistoryUndoContext
} from "./history";
import { normaliseSnapshotForPersistence } from "./garbage-collection";
import { runMigrations } from "./migrations";
import {
  StorageBroadcastOrigin,
  StorageBroadcastScope,
  type HistoryEntry,
  type IsoDateTimeString,
  type RuntimeConfiguration,
  type StorageBroadcast,
  type StorageSnapshot,
  type UiSettings
} from "./types";

export type StorageCoreState = {
  snapshot: StorageSnapshot;
  config: RuntimeConfiguration;
  settings: UiSettings;
};

export type StorageCoreListener = (state: StorageCoreState) => void;

export type StorageCoreOptions = {
  driver: StorageDriver;
  now?: () => IsoDateTimeString;
  broadcast?: (broadcast: StorageBroadcast, options?: { driver?: StorageDriver }) => void;
};

export type StorageCore = {
  getState(): StorageCoreState;
  subscribe(listener: StorageCoreListener): () => void;
  refresh(): void;
  reset(): void;
  update(updater: (snapshot: StorageSnapshot) => StorageSnapshot): boolean;
  history: {
    capture(input: HistoryCaptureInput): HistoryCaptureResult;
    undo(target: HistoryTarget, context: HistoryUndoContext): HistoryEntry | null;
    redo(target: HistoryTarget): HistoryEntry | null;
    timeline(target: HistoryTarget): HistoryTimelineView;
  };
};

export function createStorageCore(options: StorageCoreOptions): StorageCore {
  const { driver } = options;
  const now = options.now ?? (() => new Date().toISOString());
  const broadcast = options.broadcast ?? (() => {});

  const loadedSnapshot = driver.load() ?? createInitialSnapshot();
  const migrationResult = runMigrations(loadedSnapshot, STORAGE_SCHEMA_VERSION, { now });

  let initialSnapshot = migrationResult.snapshot;

  if (migrationResult.applied.length) {
    const prepared = normaliseSnapshotForPersistence(migrationResult.snapshot, { now });
    driver.save(prepared.snapshot);
    initialSnapshot = prepared.snapshot;
  }

  let currentSnapshot = initialSnapshot;
  let historyCache: HistoryCache = createHistoryCache(initialSnapshot);
  const listeners = new Set<StorageCoreListener>();

  function getState(): StorageCoreState {
    return {
      snapshot: currentSnapshot,
      config: currentSnapshot.config,
      settings: currentSnapshot.settings
    };
  }

  function notify(): void {
    const state = getState();
    for (const listener of listeners) {
      listener(state);
    }
  }

  function applySnapshot(
    nextSnapshot: StorageSnapshot,
    { persist = false, emitBroadcast = false }: { persist?: boolean; emitBroadcast?: boolean } = {}
  ): boolean {
    const previous = currentSnapshot;
    let candidate = nextSnapshot;

    if (persist && candidate !== previous) {
      const prepared = normaliseSnapshotForPersistence(candidate, { now });
      candidate = prepared.snapshot;
    }

    const changed = candidate !== previous;
    const historyChanged = candidate.history !== previous.history;

    if (persist && changed) {
      driver.save(candidate);
    }

    currentSnapshot = candidate;

    if (historyChanged) {
      historyCache = createHistoryCache(candidate);
    }

    notify();

    if (emitBroadcast && changed) {
      broadcast(
        {
          scope: StorageBroadcastScope.Snapshot,
          updatedAt: now(),
          origin: StorageBroadcastOrigin.Local
        },
        { driver }
      );
    }

    return changed;
  }

  function refresh(): void {
    const next = driver.load();
    if (!next) {
      return;
    }

    applySnapshot(next);
  }

  function reset(): void {
    const freshSnapshot: StorageSnapshot = {
      ...createInitialSnapshot(),
      config: createDefaultConfiguration()
    };

    applySnapshot(freshSnapshot, { persist: true, emitBroadcast: true });
  }

  function update(updater: (snapshot: StorageSnapshot) => StorageSnapshot): boolean {
    const nextSnapshot = updater(currentSnapshot);

    if (!nextSnapshot) {
      throw new Error("storage.update must return a snapshot");
    }

    return applySnapshot(nextSnapshot, { persist: true, emitBroadcast: true });
  }

  driver.subscribe(() => {
    refresh();
  });

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    reset,
    update,
    history: {
      capture(input) {
        const result = captureHistorySnapshot(currentSnapshot, input, { now });
        applySnapshot(result.snapshot, { persist: true, emitBroadcast: true });
        return result;
      },
      undo(target, context) {
        const { entry } = undoHistory(historyCache, target, context, { now });
        return entry;
      },
      redo(target) {
        const { entry } = redoHistory(historyCache, target);
        return entry;
      },
      timeline(target) {
        return getHistoryTimeline(historyCache, target);
      }
    }
  };
}
