import { writable, type Readable } from "svelte/store";
import { STORAGE_KEY_ROOT } from "./constants";
import { createDefaultConfiguration, createInitialSnapshot } from "./defaults";
import { createLocalStorageDriver, type StorageDriver } from "./driver";
import {
  captureHistorySnapshot,
  createHistoryCache,
  getHistoryTimeline,
  redoHistory,
  undoHistory,
  type HistoryCaptureInput,
  type HistoryCaptureResult,
  type HistoryCache,
  type HistoryTarget,
  type HistoryTimelineView,
  type HistoryUndoContext
} from "./history";
import type {
  HistoryEntry,
  IsoDateTimeString,
  RuntimeConfiguration,
  StorageBroadcast,
  StorageSnapshot,
  UiSettings
} from "./types";

export type StorageEngine = {
  snapshot: Readable<StorageSnapshot>;
  config: Readable<RuntimeConfiguration>;
  settings: Readable<UiSettings>;
  history: {
    capture(input: HistoryCaptureInput): HistoryCaptureResult;
    undo(target: HistoryTarget, context: HistoryUndoContext): HistoryEntry | null;
    redo(target: HistoryTarget): HistoryEntry | null;
    timeline(target: HistoryTarget): HistoryTimelineView;
  };
  /** Forces a reload from the underlying driver. */
  refresh(): void;
  /** Resets storage to defaults, clearing existing data. */
  reset(): void;
  /**
   * Applies a mutation to the in-memory snapshot and persists it via the driver.
   * Returns true when the snapshot reference changed (indicating a write occurred).
   */
  update(updater: (snapshot: StorageSnapshot) => StorageSnapshot): boolean;
};

export type StorageEngineOptions = {
  driver?: StorageDriver;
  now?: () => IsoDateTimeString;
  broadcast?: (broadcast: StorageBroadcast, options?: { driver?: StorageDriver }) => void;
};

const BROADCAST_CHANNEL_NAME = "kelpie.storage.broadcast";
const BROADCAST_STORAGE_KEY = `${STORAGE_KEY_ROOT}.broadcast`;

let broadcastChannel: BroadcastChannel | null = null;
let broadcastChannelBroken = false;
let pendingBroadcast: ReturnType<typeof setTimeout> | null = null;
let queuedBroadcast: StorageBroadcast | null = null;
let broadcastSequence = 0;

function resolveBroadcastChannel(): BroadcastChannel | null {
  if (broadcastChannelBroken) {
    return null;
  }

  if (broadcastChannel) {
    return broadcastChannel;
  }

  if (typeof window === "undefined") {
    return null;
  }

  if (!("BroadcastChannel" in window)) {
    broadcastChannelBroken = true;
    return null;
  }

  try {
    broadcastChannel = new window.BroadcastChannel(BROADCAST_CHANNEL_NAME);
    return broadcastChannel;
  } catch (error) {
    console.warn("Kelpie storage: failed to initialise BroadcastChannel", error);
    broadcastChannelBroken = true;
    broadcastChannel = null;
    return null;
  }
}

function emitViaBroadcastChannel(broadcast: StorageBroadcast): boolean {
  const channel = resolveBroadcastChannel();
  if (!channel) {
    return false;
  }

  try {
    channel.postMessage(broadcast);
    return true;
  } catch (error) {
    console.warn("Kelpie storage: failed to post broadcast message", error);
    try {
      channel.close();
    } catch {
      // no-op if closing fails; we'll fall back to storage events.
    }
    broadcastChannelBroken = true;
    broadcastChannel = null;
    return false;
  }
}

function emitViaStorageEvent(broadcast: StorageBroadcast): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  const payload = {
    ...broadcast,
    __timestamp: Date.now(),
    __sequence: broadcastSequence++
  };

  try {
    localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Kelpie storage: failed to write broadcast payload", error);
  }
}

/**
 * Creates a storage engine with reactive Svelte stores.
 *
 * The current implementation only hydrates defaults and exposes read-only
 * stores. Write/update flows will be implemented in future tasks.
 */
export function createStorageEngine(options: StorageEngineOptions = {}): StorageEngine {
  const driver = options.driver ?? createLocalStorageDriver(STORAGE_KEY_ROOT);
  const broadcast = options.broadcast ?? scheduleBroadcast;
  const initial = driver.load() ?? createInitialSnapshot();

  const now = options.now ?? (() => new Date().toISOString());

  const snapshotStore = writable<StorageSnapshot>(initial);
  const configStore = writable<RuntimeConfiguration>(initial.config);
  const settingsStore = writable<UiSettings>(initial.settings);

  let currentSnapshot = initial;
  let historyCache: HistoryCache = createHistoryCache(initial);

  function refresh() {
    const next = driver.load();
    if (next) {
      currentSnapshot = next;
      snapshotStore.set(next);
      configStore.set(next.config);
      settingsStore.set(next.settings);
      historyCache = createHistoryCache(next);
    }
  }

  function reset() {
    const freshSnapshot: StorageSnapshot = {
      ...createInitialSnapshot(),
      config: createDefaultConfiguration()
    };
    driver.save(freshSnapshot);
    currentSnapshot = freshSnapshot;
    snapshotStore.set(freshSnapshot);
    configStore.set(freshSnapshot.config);
    settingsStore.set(freshSnapshot.settings);
    historyCache = createHistoryCache(freshSnapshot);
    broadcast(
      {
        scope: "snapshot",
        updatedAt: new Date().toISOString(),
        origin: "local"
      },
      { driver }
    );
  }

  function update(updater: (snapshot: StorageSnapshot) => StorageSnapshot): boolean {
    const previous = currentSnapshot;
    const nextSnapshot = updater(previous);

    if (!nextSnapshot) {
      throw new Error("storage.update must return a snapshot");
    }

    const historyChanged = nextSnapshot.history !== previous.history;
    const changed = nextSnapshot !== previous;

    if (changed) {
      driver.save(nextSnapshot);
    }

    currentSnapshot = nextSnapshot;
    snapshotStore.set(nextSnapshot);
    configStore.set(nextSnapshot.config);
    settingsStore.set(nextSnapshot.settings);

    if (historyChanged) {
      historyCache = createHistoryCache(nextSnapshot);
    }
    
    if (changed) {
      broadcast(
        {
          scope: "snapshot",
          updatedAt: new Date().toISOString(),
          origin: "local"
        },
        { driver }
      );
    }

    return changed;
  }

  driver.subscribe(() => {
    refresh();
  });

  return {
    snapshot: snapshotStore,
    config: configStore,
    settings: settingsStore,
    history: {
      capture(input) {
        const result = captureHistorySnapshot(currentSnapshot, input, { now });
        update(() => result.snapshot);
        // History snapshot changes trigger cache rebuild inside update.
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
    },
    refresh,
    reset,
    update
  };
}

/**
 * Convenience helper for wiring storage broadcasts.
 *
 * Messages are coalesced until the next macrotask and delivered via
 * `BroadcastChannel` when available. Environments without `BroadcastChannel`
 * fall back to emitting a storage event so other tabs can respond.
 */
export function scheduleBroadcast(broadcast: StorageBroadcast, options: { driver?: StorageDriver } = {}): void {
  void options;

  queuedBroadcast = broadcast;

  if (pendingBroadcast) {
    return;
  }

  pendingBroadcast = setTimeout(() => {
    pendingBroadcast = null;
    const next = queuedBroadcast;
    queuedBroadcast = null;

    if (!next) {
      return;
    }

    if (emitViaBroadcastChannel(next)) {
      return;
    }

    emitViaStorageEvent(next);
  }, 0);
}
