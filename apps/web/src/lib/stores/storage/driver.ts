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
            if (typeof localStorage === "undefined") return null;
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            try {
                return JSON.parse(raw) as StorageSnapshot;
            } catch (error) {
                console.warn("Kelpie storage: failed to parse snapshot", error);
                return null;
            }
        },
        save(snapshot) {
            if (typeof localStorage === "undefined") return;
            localStorage.setItem(key, JSON.stringify(snapshot));
        },
        clear() {
            if (typeof localStorage === "undefined") return;
            localStorage.removeItem(key);
        },
        subscribe(callback) {
            if (typeof window === "undefined") {
                return () => {};
            }

            const handler = (event: StorageEvent) => {
                if (event.key === key) {
                    callback();
                }
            };

            window.addEventListener("storage", handler);
            return () => window.removeEventListener("storage", handler);
        }
    };
}
