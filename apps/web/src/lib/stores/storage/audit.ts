import type { AuditEntry, IsoDateTimeString, StorageSnapshot } from "./types";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function createAuditEntry(
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

export function appendAuditEntries(snapshot: StorageSnapshot, entries: AuditEntry | AuditEntry[]): AuditEntry[] {
  const additions = Array.isArray(entries) ? entries : [entries];

  if (!additions.length) {
    return snapshot.audit;
  }

  const cap = Math.max(0, snapshot.config.auditEntryCap);
  if (cap === 0) {
    return [];
  }

  const next = [...snapshot.audit, ...additions];
  if (next.length <= cap) {
    return next;
  }

  return next.slice(next.length - cap);
}
