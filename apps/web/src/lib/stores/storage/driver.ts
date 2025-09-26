import { getLocalStorage, getWindow } from "./environment";
import { storageWarn } from "./logging";
import type { StorageSnapshot } from "./types";

/**
 * Abstraction over the host storage API (localStorage for MVP).
 *
 * Having a thin driver interface makes it straightforward to swap in
 * alternative persistence layers in future tasks or tests.
 */
export interface StorageDriver {
  load(): StorageSnapshot | null;
  save(snapshot: StorageSnapshot): void;
  clear(): void;
  /**
   * Subscribe to external changes (e.g. storage events from other tabs).
   * Returns an unsubscribe function.
   */
  subscribe(callback: () => void): () => void;
}

export function createLocalStorageDriver(key: string): StorageDriver {
  return {
    load() {
      const storage = getLocalStorage();
      if (!storage) return null;
      const raw = storage.getItem(key);
      if (!raw) return null;

      try {
        return JSON.parse(raw) as StorageSnapshot;
      } catch (error) {
        storageWarn("failed to parse snapshot", error);
        throw error;
      }
    },
    save(snapshot) {
      const storage = getLocalStorage();
      if (!storage) return;
      storage.setItem(key, JSON.stringify(snapshot));
    },
    clear() {
      const storage = getLocalStorage();
      if (!storage) return;
      storage.removeItem(key);
    },
    subscribe(callback) {
      const host = getWindow();
      if (!host) {
        return () => {};
      }

      const handler = (event: StorageEvent) => {
        if (event.key === key) {
          callback();
        }
      };

      host.addEventListener("storage", handler);
      return () => host.removeEventListener("storage", handler);
    }
  };
}
