import { appendAuditEntries, createAuditEntry } from "./audit";
import { estimateSnapshotSize } from "./size";
import { recordQuotaWarning } from "./instrumentation";
import type { AuditEntry, HistoryEntry, IsoDateTimeString, StorageSnapshot } from "./types";

export class StorageQuotaError extends Error {
  readonly attemptedSize: number;
  readonly hardLimitBytes: number;

  constructor(attemptedSize: number, hardLimitBytes: number) {
    super(`storage payload of ${attemptedSize} bytes exceeds hard limit of ${hardLimitBytes} bytes`);
    this.name = "StorageQuotaError";
    this.attemptedSize = attemptedSize;
    this.hardLimitBytes = hardLimitBytes;
  }
}

export type NormaliseSnapshotOptions = {
  now?: () => IsoDateTimeString;
};

export function normaliseSnapshotForPersistence(
  snapshot: StorageSnapshot,
  options: NormaliseSnapshotOptions = {}
): { snapshot: StorageSnapshot; sizeInBytes: number } {
  const nowFn = options.now ?? (() => new Date().toISOString());
  let working = purgeExpiredDocuments(snapshot, nowFn);

  const warningThreshold = Math.max(0, working.config.quotaWarningBytes);
  const hardLimit = Math.max(0, working.config.quotaHardLimitBytes);

  let size = estimateSnapshotSize(working);

  if (warningThreshold > 0 && size > warningThreshold) {
    const trimmed = trimHistoryForQuota(working, warningThreshold, nowFn);
    working = trimmed.snapshot;
    size = trimmed.sizeInBytes;
  }

  if (hardLimit > 0 && size > hardLimit) {
    throw new StorageQuotaError(size, hardLimit);
  }

  if (warningThreshold > 0 && size > warningThreshold) {
    const warningEntry = createAuditEntry(AuditEventType.StorageQuotaWarning, nowFn(), {
      sizeInBytes: size,
      warningBytes: warningThreshold
    });
    const nextAudit = appendAuditEntries(working, warningEntry);
    working = { ...working, audit: nextAudit } satisfies StorageSnapshot;
    size = estimateSnapshotSize(working);
    recordQuotaWarning({ sizeInBytes: size, warningBytes: warningThreshold });
  }

  const finalSnapshot: StorageSnapshot = {
    ...working,
    meta: {
      ...working.meta,
      approxSizeBytes: size
    }
  };

  return { snapshot: finalSnapshot, sizeInBytes: size };
}

function purgeExpiredDocuments(snapshot: StorageSnapshot, nowFn: () => IsoDateTimeString): StorageSnapshot {
  if (!snapshot.index.length) {
    return snapshot;
  }

  const now = nowFn();
  const nowTime = Date.parse(now);
  if (Number.isNaN(nowTime)) {
    throw new Error(`invalid now() result '${now}' for garbage collection`);
  }

  const purgeCandidates = snapshot.index.filter((entry) => {
    if (!entry.deletedAt || !entry.purgeAfter) {
      return false;
    }
    return Date.parse(entry.purgeAfter) <= nowTime;
  });

  if (!purgeCandidates.length) {
    return snapshot;
  }

  const purgedIds = new Set(purgeCandidates.map((entry) => entry.id));
  const nextIndex = snapshot.index.filter((entry) => !purgedIds.has(entry.id));
  const nextDocuments = { ...snapshot.documents } satisfies StorageSnapshot["documents"];
  for (const id of purgedIds) {
    delete nextDocuments[id];
  }

  const prunedHistory: HistoryEntry[] = [];
  const nextHistory = snapshot.history.filter((entry) => {
    const shouldRemove = entry.scope === HistoryScope.Document && purgedIds.has(entry.refId);
    if (shouldRemove) {
      prunedHistory.push(entry);
    }
    return !shouldRemove;
  });

  let nextSettings = snapshot.settings;
  if (snapshot.settings.lastActiveDocumentId && purgedIds.has(snapshot.settings.lastActiveDocumentId)) {
    const fallback = nextIndex.find((entry) => entry.deletedAt === null)?.id ?? null;
    nextSettings = {
      ...snapshot.settings,
      lastActiveDocumentId: fallback,
      updatedAt: now
    };
  }

  const auditEntries: AuditEntry[] = purgeCandidates.map((entry) =>
    createAuditEntry(AuditEventType.DocumentPurged, now, { id: entry.id, title: entry.title })
  );

  if (prunedHistory.length) {
    auditEntries.push(
      createAuditEntry(AuditEventType.HistoryPruned, now, {
        reason: "documentPurged",
        count: prunedHistory.length,
        refIds: Array.from(new Set(prunedHistory.map((entry) => entry.refId)))
      })
    );
  }

  const baseSnapshot: StorageSnapshot = {
    ...snapshot,
    index: nextIndex,
    documents: nextDocuments,
    history: nextHistory,
    settings: nextSettings
  };

  if (!auditEntries.length) {
    return baseSnapshot;
  }

  const nextAudit = appendAuditEntries(baseSnapshot, auditEntries);
  return { ...baseSnapshot, audit: nextAudit } satisfies StorageSnapshot;
}

function trimHistoryForQuota(
  snapshot: StorageSnapshot,
  targetSize: number,
  nowFn: () => IsoDateTimeString
): { snapshot: StorageSnapshot; sizeInBytes: number } {
  if (targetSize <= 0) {
    const size = estimateSnapshotSize(snapshot);
    return { snapshot: updateApproxSize(snapshot, size), sizeInBytes: size };
  }

  let workingHistory = [...snapshot.history];
  const pruned: HistoryEntry[] = [];
  let workingSnapshot: StorageSnapshot = snapshot;

  let size = estimateSnapshotSize(workingSnapshot);

  while (size > targetSize && workingHistory.length) {
    const [removed, ...rest] = workingHistory;
    if (!removed) {
      break;
    }
    pruned.push(removed);
    workingHistory = rest;
    workingSnapshot = { ...workingSnapshot, history: workingHistory } satisfies StorageSnapshot;
    size = estimateSnapshotSize(workingSnapshot);
  }

  if (pruned.length) {
    const now = nowFn();
    const auditEntry = createAuditEntry(AuditEventType.HistoryPruned, now, {
      reason: "quota",
      count: pruned.length,
      refIds: Array.from(new Set(pruned.map((entry) => entry.refId)))
    });
    const nextAudit = appendAuditEntries(workingSnapshot, auditEntry);
    workingSnapshot = { ...workingSnapshot, audit: nextAudit } satisfies StorageSnapshot;
  }

  size = estimateSnapshotSize(workingSnapshot);
  return { snapshot: updateApproxSize(workingSnapshot, size), sizeInBytes: size };
}

function updateApproxSize(snapshot: StorageSnapshot, size: number): StorageSnapshot {
  return {
    ...snapshot,
    meta: {
      ...snapshot.meta,
      approxSizeBytes: size
    }
  };
}
