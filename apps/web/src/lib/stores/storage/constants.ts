/**
 * Centralised constants for storage implementation.
 *
 * Keeping these here lets other tasks tweak retention windows or storage keys
 * without hunting through the engine implementation.
 */
export const STORAGE_KEY_ROOT = "kelpie.storage";

export const STORAGE_SCHEMA_VERSION = 1;

export const DEFAULT_HISTORY_RETENTION_DAYS = 7;
export const DEFAULT_HISTORY_ENTRY_CAP = 200;
export const DEFAULT_AUDIT_ENTRY_CAP = 200;
export const DEFAULT_SOFT_DELETE_RETENTION_DAYS = 7;

export const DEFAULT_DEBOUNCE_WRITE_MS = 2000;
export const DEFAULT_DEBOUNCE_BROADCAST_MS = 1000;

export const DEFAULT_QUOTA_WARNING_BYTES = 750_000;
export const DEFAULT_QUOTA_HARD_LIMIT_BYTES = 1_000_000;
export const DEFAULT_GC_IDLE_TRIGGER_MS = 30_000;
