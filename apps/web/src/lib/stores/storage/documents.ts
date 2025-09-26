import type {
  AuditEntry,
  DocumentIndex,
  DocumentIndexEntry,
  DocumentSnapshot,
  IsoDateTimeString,
  StorageSnapshot
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type DocumentCreationOptions = {
  title?: string;
  content?: string;
  position?: number;
  id?: string;
  createdAt?: IsoDateTimeString;
  lastEditedBy?: string;
  now?: () => IsoDateTimeString;
};

export type DocumentUpdate = Partial<Pick<DocumentSnapshot, "title" | "content" | "lastEditedBy">>;

export type DocumentUpdateOptions = {
  now?: () => IsoDateTimeString;
};

export type SoftDeleteOptions = {
  now?: () => IsoDateTimeString;
};

export type RestoreDocumentOptions = {
  now?: () => IsoDateTimeString;
};

export type ReorderDocumentsOptions = {
  now?: () => IsoDateTimeString;
};

export function createDocument(snapshot: StorageSnapshot, options: DocumentCreationOptions = {}): StorageSnapshot {
  const createdAt = options.createdAt ?? resolveNow(options.now);
  const id = options.id ?? createId();
  const title = normaliseTitle(options.title);
  const content = options.content ?? "";

  const document: DocumentSnapshot = {
    id,
    title,
    content,
    createdAt,
    updatedAt: createdAt,
    ...(options.lastEditedBy ? { lastEditedBy: options.lastEditedBy } : {})
  } satisfies DocumentSnapshot;

  const newEntry: DocumentIndexEntry = {
    id,
    title,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    purgeAfter: null
  } satisfies DocumentIndexEntry;

  const nextIndex = insertDocumentEntry(snapshot.index, newEntry, options.position);
  const nextDocuments = {
    ...snapshot.documents,
    [id]: document
  } satisfies StorageSnapshot["documents"];

  const nextSettings = {
    ...snapshot.settings,
    lastActiveDocumentId: id,
    updatedAt: createdAt
  } satisfies StorageSnapshot["settings"];

  const auditEntry = createAuditEntry("document.created", createdAt, {
    id,
    title
  });

  return {
    ...snapshot,
    documents: nextDocuments,
    index: nextIndex,
    settings: nextSettings,
    audit: appendAudit(snapshot.audit, auditEntry)
  } satisfies StorageSnapshot;
}

export function updateDocument(
  snapshot: StorageSnapshot,
  documentId: string,
  mutator: (document: DocumentSnapshot) => DocumentUpdate | null | undefined,
  options: DocumentUpdateOptions = {}
): StorageSnapshot {
  const existing = snapshot.documents[documentId];
  if (!existing) {
    throw new Error(`unknown document '${documentId}'`);
  }

  const draft: DocumentSnapshot = { ...existing };
  const patch = mutator({ ...draft });
  if (!patch) {
    return snapshot;
  }

  const next: DocumentSnapshot = {
    ...existing,
    ...omitUndefined(patch),
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt
  } satisfies DocumentSnapshot;

  const changedFields = resolveDocumentChanges(existing, next);
  if (!changedFields.length) {
    return snapshot;
  }

  const updatedAt = options.now?.() ?? resolveNow();
  next.updatedAt = updatedAt;

  if (!("lastEditedBy" in patch)) {
    next.lastEditedBy = existing.lastEditedBy;
  } else if (patch.lastEditedBy === undefined) {
    delete next.lastEditedBy;
  }

  const nextDocuments = {
    ...snapshot.documents,
    [documentId]: next
  } satisfies StorageSnapshot["documents"];

  const nextIndex = snapshot.index.map((entry) =>
    entry.id === documentId
      ? ({
          ...entry,
          title: next.title,
          updatedAt
        } satisfies DocumentIndexEntry)
      : entry
  );

  const nextSettings = {
    ...snapshot.settings,
    updatedAt
  } satisfies StorageSnapshot["settings"];

  const auditEntry = createAuditEntry("document.updated", updatedAt, {
    id: documentId,
    fields: changedFields
  });

  return {
    ...snapshot,
    documents: nextDocuments,
    index: nextIndex,
    settings: nextSettings,
    audit: appendAudit(snapshot.audit, auditEntry)
  } satisfies StorageSnapshot;
}

export function softDeleteDocument(
  snapshot: StorageSnapshot,
  documentId: string,
  options: SoftDeleteOptions = {}
): StorageSnapshot {
  const index = snapshot.index;
  const entryIndex = index.findIndex((entry) => entry.id === documentId);
  if (entryIndex === -1) {
    throw new Error(`unknown document '${documentId}'`);
  }

  const entry = index[entryIndex]!;
  if (entry.deletedAt) {
    return snapshot;
  }

  const deletedAt = options.now?.() ?? resolveNow();
  const retentionDays = snapshot.config.softDeleteRetentionDays;
  const purgeAfter = new Date(new Date(deletedAt).getTime() + Math.max(retentionDays, 0) * MS_PER_DAY).toISOString();

  const nextEntry: DocumentIndexEntry = {
    ...entry,
    deletedAt,
    purgeAfter,
    updatedAt: deletedAt
  } satisfies DocumentIndexEntry;

  const nextIndex = [...index.slice(0, entryIndex), nextEntry, ...index.slice(entryIndex + 1)] satisfies DocumentIndex;

  const nextActiveId =
    snapshot.settings.lastActiveDocumentId === documentId
      ? resolveNextActiveDocumentId(index, entryIndex, documentId)
      : snapshot.settings.lastActiveDocumentId;

  const nextSettings = {
    ...snapshot.settings,
    lastActiveDocumentId: nextActiveId,
    updatedAt: deletedAt
  } satisfies StorageSnapshot["settings"];

  const auditEntry = createAuditEntry("document.deleted", deletedAt, {
    id: documentId,
    purgeAfter
  });

  return {
    ...snapshot,
    index: nextIndex,
    settings: nextSettings,
    audit: appendAudit(snapshot.audit, auditEntry)
  } satisfies StorageSnapshot;
}

export function restoreDocument(
  snapshot: StorageSnapshot,
  documentId: string,
  options: RestoreDocumentOptions = {}
): StorageSnapshot {
  const entryIndex = snapshot.index.findIndex((entry) => entry.id === documentId);
  if (entryIndex === -1) {
    throw new Error(`unknown document '${documentId}'`);
  }

  const entry = snapshot.index[entryIndex]!;
  if (!entry.deletedAt) {
    return snapshot;
  }

  const restoredAt = options.now?.() ?? resolveNow();
  const nextEntry: DocumentIndexEntry = {
    ...entry,
    deletedAt: null,
    purgeAfter: null,
    updatedAt: restoredAt
  } satisfies DocumentIndexEntry;

  const nextIndex = [
    ...snapshot.index.slice(0, entryIndex),
    nextEntry,
    ...snapshot.index.slice(entryIndex + 1)
  ] satisfies DocumentIndex;

  const shouldActivate = snapshot.settings.lastActiveDocumentId === null;

  const nextSettings = {
    ...snapshot.settings,
    lastActiveDocumentId: shouldActivate ? documentId : snapshot.settings.lastActiveDocumentId,
    updatedAt: restoredAt
  } satisfies StorageSnapshot["settings"];

  const auditEntry = createAuditEntry("document.restored", restoredAt, {
    id: documentId
  });

  return {
    ...snapshot,
    index: nextIndex,
    settings: nextSettings,
    audit: appendAudit(snapshot.audit, auditEntry)
  } satisfies StorageSnapshot;
}

export function reorderDocuments(
  snapshot: StorageSnapshot,
  newOrderIds: string[],
  options: ReorderDocumentsOptions = {}
): StorageSnapshot {
  const activeEntries = snapshot.index.filter((entry) => entry.deletedAt === null);
  const beforeOrder = activeEntries.map((entry) => entry.id);

  validateReorderInputs(activeEntries, newOrderIds);

  if (arraysEqual(beforeOrder, newOrderIds)) {
    return snapshot;
  }

  const idToEntry = new Map(activeEntries.map((entry) => [entry.id, entry] as const));
  const reorderedActive = newOrderIds.map((id) => idToEntry.get(id)!);
  const deletedEntries = snapshot.index.filter((entry) => entry.deletedAt !== null);
  const nextIndex: DocumentIndex = [...reorderedActive, ...deletedEntries];

  const reorderedAt = options.now?.() ?? resolveNow();
  const auditEntry = createAuditEntry("document.reordered", reorderedAt, {
    before: beforeOrder,
    after: newOrderIds
  });

  return {
    ...snapshot,
    index: nextIndex,
    audit: appendAudit(snapshot.audit, auditEntry)
  } satisfies StorageSnapshot;
}

function resolveNow(now?: () => IsoDateTimeString): IsoDateTimeString {
  return now ? now() : new Date().toISOString();
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function normaliseTitle(title: string | undefined): string {
  if (!title) {
    return "Untitled document";
  }
  const trimmed = title.trim();
  return trimmed.length ? trimmed : "Untitled document";
}

function insertDocumentEntry(
  index: DocumentIndex,
  entry: DocumentIndexEntry,
  position: number | undefined
): DocumentIndex {
  const activeEntries = index.filter((item) => item.deletedAt === null);
  const activeCount = activeEntries.length;
  const clampedPosition = Math.max(0, Math.min(position ?? activeCount, activeCount));

  const next: DocumentIndex = [];
  let inserted = false;
  let seenActive = 0;

  for (const item of index) {
    if (!inserted && item.deletedAt === null && seenActive === clampedPosition) {
      next.push(entry);
      inserted = true;
    }

    next.push(item);

    if (item.deletedAt === null) {
      seenActive += 1;
    }
  }

  if (!inserted) {
    next.push(entry);
  }

  return next;
}

function resolveDocumentChanges(previous: DocumentSnapshot, next: DocumentSnapshot): string[] {
  const changed: string[] = [];

  if (previous.title !== next.title) {
    changed.push("title");
  }
  if (previous.content !== next.content) {
    changed.push("content");
  }
  if (previous.lastEditedBy !== next.lastEditedBy) {
    changed.push("lastEditedBy");
  }

  return changed;
}

function resolveNextActiveDocumentId(index: DocumentIndex, deletedIndex: number, deletedId: string): string | null {
  for (let i = deletedIndex + 1; i < index.length; i += 1) {
    const entry = index[i];
    if (entry && entry.deletedAt === null && entry.id !== deletedId) {
      return entry.id;
    }
  }

  for (let i = deletedIndex - 1; i >= 0; i -= 1) {
    const entry = index[i];
    if (entry && entry.deletedAt === null && entry.id !== deletedId) {
      return entry.id;
    }
  }

  return null;
}

function appendAudit(existing: AuditEntry[], entry: AuditEntry): AuditEntry[] {
  return [...existing, entry];
}

function createAuditEntry(
  type: AuditEntry["type"],
  createdAt: IsoDateTimeString,
  metadata?: Record<string, unknown>
): AuditEntry {
  return {
    id: createId(),
    type,
    createdAt,
    ...(metadata ? { metadata } : {})
  } satisfies AuditEntry;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, val] of Object.entries(value) as Array<[keyof T, T[keyof T]]>) {
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

function validateReorderInputs(activeEntries: DocumentIndexEntry[], newOrderIds: string[]): void {
  const activeIds = new Set(activeEntries.map((entry) => entry.id));

  if (newOrderIds.length !== activeIds.size) {
    throw new Error("document reorder payload must include every active document exactly once");
  }

  const seen = new Set<string>();
  for (const id of newOrderIds) {
    if (!activeIds.has(id)) {
      throw new Error(`cannot reorder unknown or inactive document '${id}'`);
    }
    if (seen.has(id)) {
      throw new Error(`document reorder payload contains duplicate id '${id}'`);
    }
    seen.add(id);
  }
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
