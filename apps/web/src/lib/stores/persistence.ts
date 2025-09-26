import { writable } from "svelte/store";
import { SaveStatusKind } from "$lib/app-shell/contracts";
import type { SaveStatus } from "$lib/app-shell/contracts";

const initialStatus: SaveStatus = { kind: SaveStatusKind.Idle, message: "Saved locally \u2713", timestamp: null };

const { subscribe, set } = writable<SaveStatus>(initialStatus);

export const saveStatus = { subscribe };

export function markSaving(): void {
  set({ kind: SaveStatusKind.Saving, message: "Saving locally\u2026", timestamp: Date.now() });
}

export function markSaved(): void {
  set({ kind: SaveStatusKind.Saved, message: "Saved locally \u2713", timestamp: Date.now() });
}

export function markError(error: unknown): void {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Failed to save locally";
  set({ kind: SaveStatusKind.Error, message, timestamp: Date.now() });
}

export function resetSaveStatus(): void {
  set(initialStatus);
}

export function setSaveStatusForTesting(status: SaveStatus): void {
  set(status);
}

const globalWithSetter = globalThis as { __kelpieSetSaveStatus?: (status: SaveStatus) => void };
globalWithSetter.__kelpieSetSaveStatus = setSaveStatusForTesting;
