import {
  DEFAULT_AUDIT_ENTRY_CAP,
  DEFAULT_DEBOUNCE_BROADCAST_MS,
  DEFAULT_DEBOUNCE_WRITE_MS,
  DEFAULT_GC_IDLE_TRIGGER_MS,
  DEFAULT_HISTORY_ENTRY_CAP,
  DEFAULT_HISTORY_RETENTION_DAYS,
  DEFAULT_QUOTA_HARD_LIMIT_BYTES,
  DEFAULT_QUOTA_WARNING_BYTES,
  DEFAULT_SOFT_DELETE_RETENTION_DAYS,
  STORAGE_SCHEMA_VERSION
} from "./constants";
import { estimateSnapshotSize } from "./size";
import type { RuntimeConfiguration, StorageSnapshot, UiSettings } from "./types";

function isoNow(): string {
  return new Date().toISOString();
}

export function createDefaultConfiguration(): RuntimeConfiguration {
  return {
    debounce: {
      writeMs: DEFAULT_DEBOUNCE_WRITE_MS,
      broadcastMs: DEFAULT_DEBOUNCE_BROADCAST_MS
    },
    historyRetentionDays: DEFAULT_HISTORY_RETENTION_DAYS,
    historyEntryCap: DEFAULT_HISTORY_ENTRY_CAP,
    auditEntryCap: DEFAULT_AUDIT_ENTRY_CAP,
    softDeleteRetentionDays: DEFAULT_SOFT_DELETE_RETENTION_DAYS,
    quotaWarningBytes: DEFAULT_QUOTA_WARNING_BYTES,
    quotaHardLimitBytes: DEFAULT_QUOTA_HARD_LIMIT_BYTES,
    gcIdleTriggerMs: DEFAULT_GC_IDLE_TRIGGER_MS
  };
}

export function createDefaultSettings(): UiSettings {
  const now = isoNow();
  return {
    lastActiveDocumentId: null,
    panes: {},
    filters: {},
    createdAt: now,
    updatedAt: now
  };
}

function createInstallationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function createInitialSnapshot(): StorageSnapshot {
  const now = isoNow();
  const installationId = createInstallationId();

  const snapshot: StorageSnapshot = {
    meta: {
      version: STORAGE_SCHEMA_VERSION,
      installationId,
      createdAt: now,
      lastOpenedAt: now
    },
    config: createDefaultConfiguration(),
    settings: createDefaultSettings(),
    index: [],
    documents: {},
    history: [],
    audit: []
  };

  return {
    ...snapshot,
    meta: {
      ...snapshot.meta,
      approxSizeBytes: estimateSnapshotSize(snapshot)
    }
  } satisfies StorageSnapshot;
}
