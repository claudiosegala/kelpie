/**
 * Host environment utilities used by the storage layer.
 *
 * Centralising these checks makes it easier to stub globals in tests
 * and swap implementations when new platforms are supported.
 */
export function getWindow(): (Window & typeof globalThis) | null {
  return typeof window === "undefined" ? null : window;
}

export function getLocalStorage(): Storage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}
