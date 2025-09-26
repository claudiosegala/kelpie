import { STORAGE_SCHEMA_VERSION } from "./constants";
import { createDefaultConfiguration, createInitialSnapshot } from "./defaults";
import { appendAuditEntries, createAuditEntry } from "./audit";
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
import { logStorageMutation, recordCorruption, recordMigrationSummary } from "./instrumentation";
import { estimateSnapshotSize } from "./size";
import type {
  HistoryEntry,
  IsoDateTimeString,
  RuntimeConfiguration,
  StorageBroadcast,
  StorageSnapshot,
  UiSettings
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
  simulateFirstRun(): void;
  runGarbageCollection(): void;
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

  let corruptionAudit: ReturnType<typeof createAuditEntry> | null = null;
  const loadedSnapshot =
    driver.load({
      onCorruption(error) {
        const metadata: Record<string, unknown> = {
          reason: error.reason
        };

        if (error.expectedChecksum || error.actualChecksum) {
          const checksum: Record<string, string> = {};
          if (error.expectedChecksum) {
            checksum.expected = error.expectedChecksum;
          }
          if (error.actualChecksum) {
            checksum.actual = error.actualChecksum;
          }
          metadata.checksum = checksum;
        }

        corruptionAudit = createAuditEntry("storage.corruption", now(), metadata);
        recordCorruption({
          reason: error.reason,
          expectedChecksum: error.expectedChecksum,
          actualChecksum: error.actualChecksum
        });
      }
    }) ?? createInitialSnapshot();

  const migrationStart = Date.now();
  const migrationResult = runMigrations(loadedSnapshot, STORAGE_SCHEMA_VERSION, { now });
  const migrationDurationMs = Date.now() - migrationStart;

  recordMigrationSummary({
    fromVersion: loadedSnapshot.meta.version ?? null,
    toVersion: STORAGE_SCHEMA_VERSION,
    durationMs: migrationDurationMs,
    applied: migrationResult.applied.map((migration) => `${migration.from}->${migration.to}`)
  });

  let initialSnapshot = migrationResult.snapshot;

  if (corruptionAudit) {
    const nextAudit = appendAuditEntries(initialSnapshot, corruptionAudit);
    initialSnapshot = { ...initialSnapshot, audit: nextAudit } satisfies StorageSnapshot;
  }

  const shouldPersist = migrationResult.applied.length > 0 || Boolean(corruptionAudit);

  if (shouldPersist) {
    const prepared = normaliseSnapshotForPersistence(initialSnapshot, { now });
    driver.save(prepared.snapshot);
    logStorageMutation("storage.boot.persist", {
      beforeBytes: loadedSnapshot.meta.approxSizeBytes ?? estimateSnapshotSize(loadedSnapshot),
      afterBytes: prepared.sizeInBytes,
      metadata: { reason: corruptionAudit ? "corruption" : "migration" }
    });
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
    {
      persist = false,
      emitBroadcast = false,
      label = "storage.update"
    }: { persist?: boolean; emitBroadcast?: boolean; label?: string } = {}
  ): boolean {
    const previous = currentSnapshot;
    let candidate = nextSnapshot;
    let prepared: ReturnType<typeof normaliseSnapshotForPersistence> | null = null;

    if (persist && candidate !== previous) {
      prepared = normaliseSnapshotForPersistence(candidate, { now });
      candidate = prepared.snapshot;
    }

    const changed = candidate !== previous;
    const historyChanged = candidate.history !== previous.history;

    if (persist && changed) {
      driver.save(candidate);
      logStorageMutation(label, {
        beforeBytes: previous.meta.approxSizeBytes ?? estimateSnapshotSize(previous),
        afterBytes: prepared?.sizeInBytes ?? estimateSnapshotSize(candidate),
        metadata: { broadcast: emitBroadcast }
      });
    }

    currentSnapshot = candidate;

    if (historyChanged) {
      historyCache = createHistoryCache(candidate);
    }

    notify();

    if (emitBroadcast && changed) {
      broadcast(
        {
          scope: "snapshot",
          updatedAt: now(),
          origin: "local"
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

    applySnapshot(next, { label: "storage.refresh" });
  }

  function reset(): void {
    const freshSnapshot: StorageSnapshot = {
      ...createInitialSnapshot(),
      config: createDefaultConfiguration()
    };

    const seeded = {
      ...freshSnapshot,
      audit: appendAuditEntries(freshSnapshot, createAuditEntry("storage.reset", now()))
    } satisfies StorageSnapshot;

    applySnapshot(seeded, { persist: true, emitBroadcast: true, label: "storage.reset" });
  }

  function simulateFirstRun(): void {
    const base = createInitialSnapshot();
    const timestamp = now();

    const seeded: StorageSnapshot = {
      ...base,
      config: currentSnapshot.config,
      meta: {
        ...base.meta,
        installationId: currentSnapshot.meta.installationId,
        createdAt: currentSnapshot.meta.createdAt,
        lastOpenedAt: timestamp
      }
    };

    const annotated = {
      ...seeded,
      audit: appendAuditEntries(seeded, createAuditEntry("storage.simulatedFirstRun", timestamp))
    } satisfies StorageSnapshot;

    applySnapshot(annotated, { persist: true, emitBroadcast: true, label: "storage.simulatedFirstRun" });
  }

  function runGarbageCollection(): void {
    const prepared = normaliseSnapshotForPersistence(currentSnapshot, { now });
    applySnapshot(prepared.snapshot, {
      persist: true,
      emitBroadcast: true,
      label: "storage.gc.run"
    });
  }

  function update(updater: (snapshot: StorageSnapshot) => StorageSnapshot): boolean {
    const nextSnapshot = updater(currentSnapshot);

    if (!nextSnapshot) {
      throw new Error("storage.update must return a snapshot");
    }

    return applySnapshot(nextSnapshot, { persist: true, emitBroadcast: true, label: "storage.update" });
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
    simulateFirstRun,
    runGarbageCollection,
    update,
    history: {
      capture(input) {
        const result = captureHistorySnapshot(currentSnapshot, input, { now });
        applySnapshot(result.snapshot, {
          persist: true,
          emitBroadcast: true,
          label: `history.capture.${input.scope}`
        });
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
