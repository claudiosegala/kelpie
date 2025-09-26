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
};

export type RuntimeConfiguration = {
  debounce: {
    writeMs: number;
    broadcastMs: number;
  };
  historyRetentionDays: number;
  historyEntryCap: number;
  auditEntryCap: number;
  softDeleteRetentionDays: number;
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

export type HistoryScope = "document" | "settings";

export type HistoryEntry = {
  id: string;
  scope: HistoryScope;
  refId: string; // document id for doc history, "settings" otherwise
  snapshot: unknown; // will be narrowed by feature-specific modules
  createdAt: IsoDateTimeString;
  author?: string;
};

export type AuditEventType =
  | "document.created"
  | "document.updated"
  | "document.deleted"
  | "document.restored"
  | "history.pruned"
  | "settings.updated"
  | "migration.completed"
  | "storage.reset"
  | "storage.corruption";

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
export type StorageBroadcast = {
  scope: "snapshot" | "documents" | "settings" | "config" | "history" | "audit";
  updatedAt: IsoDateTimeString;
  origin: "local" | "external";
};
