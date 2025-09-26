/**
 * Shared types describing the persisted storage schema.
 *
 * The goal is to keep all schema-related definitions colocated so that
 * follow-up tasks can focus on feature-specific logic (history, audit, gc, etc.)
 * without repeating structural assumptions.
 */
export type IsoDateTimeString = string; // ISO-8601 timestamps only.

export type InstallationMeta = {
  version: number;
  installationId: string;
  createdAt: IsoDateTimeString;
  lastOpenedAt: IsoDateTimeString;
  migratedFrom?: string;
  approxSizeBytes?: number;
};

export type RuntimeConfiguration = {
  debounce: {
    writeMs: number;
    broadcastMs: number;
  };
  historyRetentionDays: number;
  historyEntryCap: number;
  auditEntryCap: number;
  enableAudit: boolean;
  redactAuditMetadata: boolean;
  softDeleteRetentionDays: number;
  quotaWarningBytes: number;
  quotaHardLimitBytes: number;
  gcIdleTriggerMs: number;
};

export type UiSettings = {
  lastActiveDocumentId: string | null;
  panes: Record<string, boolean>;
  filters: Record<string, unknown>;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
};

export type DocumentIndexEntry = {
  id: string;
  title: string;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  deletedAt: IsoDateTimeString | null;
  purgeAfter: IsoDateTimeString | null;
};

export type DocumentIndex = DocumentIndexEntry[];

export type DocumentSnapshot = {
  id: string;
  title: string;
  content: string;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  lastEditedBy?: string;
};

export enum HistoryScope {
  Document = "document",
  Settings = "settings"
}

export enum HistoryOrigin {
  Keyboard = "keyboard",
  Toolbar = "toolbar",
  Api = "api"
}

export type HistoryEntry = {
  id: string;
  scope: HistoryScope;
  refId: string; // document id for doc history, "settings" otherwise
  snapshot: unknown; // will be narrowed by feature-specific modules
  createdAt: IsoDateTimeString;
  author?: string;
  origin: HistoryOrigin;
  sequence: number;
};

export const AuditEventType = {
  DocumentCreated: "document.created",
  DocumentUpdated: "document.updated",
  DocumentDeleted: "document.deleted",
  DocumentRestored: "document.restored",
  DocumentReordered: "document.reordered",
  DocumentPurged: "document.purged",
  HistoryPruned: "history.pruned",
  SettingsUpdated: "settings.updated",
  MigrationCompleted: "migration.completed",
  StorageReset: "storage.reset",
  StorageSimulatedFirstRun: "storage.simulatedFirstRun",
  StorageGarbageCollectionRun: "storage.gc.run",
  StorageCorruption: "storage.corruption",
  StorageQuotaWarning: "storage.quota.warning"
} as const;

export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];

export type AuditEntry = {
  id: string;
  type: AuditEventType;
  createdAt: IsoDateTimeString;
  author?: string;
  metadata?: Record<string, unknown>;
};

export type StorageSnapshot = {
  meta: InstallationMeta;
  config: RuntimeConfiguration;
  settings: UiSettings;
  index: DocumentIndex;
  documents: Record<string, DocumentSnapshot>;
  history: HistoryEntry[];
  audit: AuditEntry[];
};

export type StorageMutationResult = {
  snapshot: StorageSnapshot;
  writes: number;
  sizeInBytes: number;
};

/**
 * Event payload describing a change broadcast across tabs.
 */
export const StorageBroadcastScope = {
  Snapshot: "snapshot",
  Documents: "documents",
  Settings: "settings",
  Config: "config",
  History: "history",
  Audit: "audit"
} as const;

export type StorageBroadcastScope = (typeof StorageBroadcastScope)[keyof typeof StorageBroadcastScope];

export const StorageBroadcastOrigin = {
  Local: "local",
  External: "external"
} as const;

export type StorageBroadcastOrigin = (typeof StorageBroadcastOrigin)[keyof typeof StorageBroadcastOrigin];

export type StorageBroadcast = {
  scope: StorageBroadcastScope;
  updatedAt: IsoDateTimeString;
  origin: StorageBroadcastOrigin;
};
