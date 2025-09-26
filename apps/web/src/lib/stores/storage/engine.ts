import { writable, type Readable } from "svelte/store";
import { STORAGE_KEY_ROOT } from "./constants";
import { scheduleBroadcast } from "./broadcast";
import { createStorageCore, type StorageCore } from "./core";
import { createLocalStorageDriver, type StorageDriver } from "./driver";
import type { IsoDateTimeString, RuntimeConfiguration, StorageBroadcast, StorageSnapshot, UiSettings } from "./types";

export type StorageEngine = {
  snapshot: Readable<StorageSnapshot>;
  config: Readable<RuntimeConfiguration>;
  settings: Readable<UiSettings>;
  history: StorageCore["history"];
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

export function createStorageEngine(options: StorageEngineOptions = {}): StorageEngine {
  const driver = options.driver ?? createLocalStorageDriver(STORAGE_KEY_ROOT);
  const core = createStorageCore({
    driver,
    now: options.now,
    broadcast: options.broadcast ?? scheduleBroadcast
  });

  const initialState = core.getState();

  const snapshotStore = writable<StorageSnapshot>(initialState.snapshot);
  const configStore = writable<RuntimeConfiguration>(initialState.config);
  const settingsStore = writable<UiSettings>(initialState.settings);

  core.subscribe((state) => {
    snapshotStore.set(state.snapshot);
    configStore.set(state.config);
    settingsStore.set(state.settings);
  });

  return {
    snapshot: snapshotStore,
    config: configStore,
    settings: settingsStore,
    history: core.history,
    refresh: core.refresh,
    reset: core.reset,
    update: core.update
  };
}
