/**
 * Host environment utilities used by the storage layer.
 *
 * Centralising these checks makes it easier to stub globals in tests
 * and swap implementations when new platforms are supported.
 */
import { storageWarn } from "./logging";

export function getWindow(): (Window & typeof globalThis) | null {
  if (typeof window === "undefined") {
    storageWarn("window is not available");
    return null;
  }

  return window;
}

export function getLocalStorage(): Storage | null {
  if (typeof localStorage === "undefined") {
    storageWarn("localStorage is not available");
    return null;
  }

  return localStorage;
}
