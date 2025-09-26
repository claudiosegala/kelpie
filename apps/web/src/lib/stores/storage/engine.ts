import { writable, type Readable } from "svelte/store";
import { STORAGE_KEY_ROOT } from "./constants";
import { createDefaultConfiguration, createInitialSnapshot } from "./defaults";
import { createLocalStorageDriver, type StorageDriver } from "./driver";
import type { RuntimeConfiguration, StorageBroadcast, StorageSnapshot, UiSettings } from "./types";

export type StorageEngine = {
  snapshot: Readable<StorageSnapshot>;
  config: Readable<RuntimeConfiguration>;
  settings: Readable<UiSettings>;
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
};

/**
 * Creates a storage engine with reactive Svelte stores.
 *
 * The current implementation only hydrates defaults and exposes read-only
 * stores. Write/update flows will be implemented in future tasks.
 */
export function createStorageEngine(options: StorageEngineOptions = {}): StorageEngine {
  const driver = options.driver ?? createLocalStorageDriver(STORAGE_KEY_ROOT);
  const initial = driver.load() ?? createInitialSnapshot();

  const snapshotStore = writable<StorageSnapshot>(initial);
  const configStore = writable<RuntimeConfiguration>(initial.config);
  const settingsStore = writable<UiSettings>(initial.settings);

  function refresh() {
    const next = driver.load();
    if (next) {
      snapshotStore.set(next);
      configStore.set(next.config);
      settingsStore.set(next.settings);
    }
  }

  function reset() {
    const freshSnapshot: StorageSnapshot = {
      ...createInitialSnapshot(),
      config: createDefaultConfiguration()
    };
    driver.save(freshSnapshot);
    snapshotStore.set(freshSnapshot);
    configStore.set(freshSnapshot.config);
    settingsStore.set(freshSnapshot.settings);
  }

  function update(updater: (snapshot: StorageSnapshot) => StorageSnapshot): boolean {
    let changed = false;
    let nextSnapshot: StorageSnapshot | undefined;

    snapshotStore.update((current) => {
      const next = updater(current);

      if (!next) {
        nextSnapshot = undefined;
        return current;
      }

      nextSnapshot = next;

      if (next !== current) {
        changed = true;
        return next;
      }

      return current;
    });

    if (!nextSnapshot) {
      throw new Error("storage.update must return a snapshot");
    }

    if (changed) {
      driver.save(nextSnapshot);
    }

    configStore.set(nextSnapshot.config);
    settingsStore.set(nextSnapshot.settings);

    return changed;
  }

  driver.subscribe(() => {
    refresh();
  });

  return {
    snapshot: snapshotStore,
    config: configStore,
    settings: settingsStore,
    refresh,
    reset,
    update
  };
}

/**
 * Convenience helper for wiring storage broadcasts. Currently this is a stub
 * that simply wraps setTimeout to keep type signatures ready for future work.
 */
export function scheduleBroadcast(_broadcast: StorageBroadcast, _options: { driver?: StorageDriver } = {}): void {
  // Placeholder implementation: future work will push messages via BroadcastChannel or similar.
  void _broadcast;
  void _options;
}
