import { writable } from "svelte/store";
import type { SaveStatus } from "$lib/app-shell/contracts";

const initialStatus: SaveStatus = { kind: "idle", message: "Saved \u2713", timestamp: null };

const { subscribe, set } = writable<SaveStatus>(initialStatus);

export const saveStatus = { subscribe };

export function markSaving(): void {
    set({ kind: "saving", message: "Saving locally\u2026", timestamp: Date.now() });
}

export function markSaved(): void {
    set({ kind: "saved", message: "Saved \u2713", timestamp: Date.now() });
}

export function markError(error: unknown): void {
    const message =
        error instanceof Error ? error.message : typeof error === "string" ? error : "Failed to save locally";
    set({ kind: "error", message, timestamp: Date.now() });
}
