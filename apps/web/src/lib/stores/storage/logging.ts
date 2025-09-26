/**
 * Centralised logging helpers for the storage layer.
 *
 * Using a shared prefix keeps console output consistent and
 * makes it easier to adjust messaging in future maintenance
 * tasks without touching every call site.
 */
export const STORAGE_LOG_PREFIX = "Kelpie storage";

export function storageWarn(message: string, ...details: unknown[]): void {
  console.warn(`${STORAGE_LOG_PREFIX}: ${message}`, ...details);
}
