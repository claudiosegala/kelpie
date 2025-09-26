import { appendAuditEntries } from "./audit";
import {
  HistoryScope,
  type AuditEntry,
  type HistoryEntry,
  type HistoryOrigin,
  type IsoDateTimeString,
  type RuntimeConfiguration,
  type StorageSnapshot
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type HistoryUtilitiesOptions = {
  now?: () => IsoDateTimeString;
};

type InternalFutureEntry = {
  entry: HistoryEntry;
  cursor: HistoryEntry | null;
};

type HistoryTimelineState = {
  scope: HistoryScope;
  refId: string;
  past: HistoryEntry[];
  cursor: HistoryEntry | null;
  future: InternalFutureEntry[];
};

export type HistoryTimelineView = {
  scope: HistoryScope;
  refId: string;
  past: HistoryEntry[];
  cursor: HistoryEntry | null;
  future: HistoryEntry[];
};

export type HistoryCache = {
  timelines: Map<string, HistoryTimelineState>;
  nextSequence: number;
};

export type HistoryTarget = {
  scope: HistoryScope;
  refId: string;
};

export type HistoryCaptureInput = {
  scope: HistoryScope;
  refId: string;
  snapshot: unknown;
  origin: HistoryOrigin;
  author?: string;
  createdAt?: IsoDateTimeString;
  id?: string;
};

export type HistoryCaptureResult = {
  snapshot: StorageSnapshot;
  entry: HistoryEntry;
  pruned: HistoryEntry[];
  auditEntry: AuditEntry | null;
};

export type HistoryUndoContext = {
  snapshot: unknown;
  origin: HistoryOrigin;
  author?: string;
  createdAt?: IsoDateTimeString;
  id?: string;
};

export function createHistoryCache(snapshot: StorageSnapshot): HistoryCache {
  const cache: HistoryCache = {
    timelines: new Map<string, HistoryTimelineState>(),
    nextSequence: 1
  };

  if (!snapshot.history.length) {
    return cache;
  }

  const sorted = [...snapshot.history].sort((a, b) => {
    if (a.sequence !== b.sequence) {
      return a.sequence - b.sequence;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });

  for (const entry of sorted) {
    const timeline = ensureTimeline(cache, { scope: entry.scope, refId: entry.refId });
    if (timeline.cursor) {
      timeline.past.push(timeline.cursor);
    }
    timeline.cursor = entry;
    timeline.future = [];
  }

  const lastSequence = sorted[sorted.length - 1]?.sequence ?? 0;
  cache.nextSequence = lastSequence + 1;

  return cache;
}

export function captureHistorySnapshot(
  snapshot: StorageSnapshot,
  capture: HistoryCaptureInput,
  options: HistoryUtilitiesOptions = {}
): HistoryCaptureResult {
  validateHistoryCapture(snapshot, capture);

  const nowFn = options.now ?? isoNow;
  const createdAt = capture.createdAt ?? nowFn();
  const sequence = computeNextSequence(snapshot.history);

  const entry: HistoryEntry = {
    id: capture.id ?? createId(),
    scope: capture.scope,
    refId: capture.refId,
    snapshot: capture.snapshot,
    createdAt,
    author: capture.author,
    origin: capture.origin,
    sequence
  };

  const nextHistory = [...snapshot.history, entry];
  const { retained, pruned } = pruneHistory(nextHistory, snapshot.config, nowFn);

  let auditEntry: AuditEntry | null = null;
  let nextAudit = snapshot.audit;

  if (pruned.length) {
    auditEntry = createHistoryAuditEntry(pruned, snapshot.config, nowFn);
    nextAudit = appendAuditEntries(snapshot, auditEntry);
  }

  return {
    snapshot: {
      ...snapshot,
      history: retained,
      audit: nextAudit
    },
    entry,
    pruned,
    auditEntry
  };
}

export function getHistoryTimeline(cache: HistoryCache, target: HistoryTarget): HistoryTimelineView {
  const timeline = ensureTimeline(cache, target);
  return {
    scope: timeline.scope,
    refId: timeline.refId,
    past: [...timeline.past],
    cursor: timeline.cursor,
    future: [...timeline.future].reverse().map((item) => item.entry)
  };
}

export function undoHistory(
  cache: HistoryCache,
  target: HistoryTarget,
  context: HistoryUndoContext,
  options: HistoryUtilitiesOptions = {}
): { entry: HistoryEntry | null; redoEntry: HistoryEntry | null } {
  const timeline = ensureTimeline(cache, target);
  if (!timeline.cursor) {
    return { entry: null, redoEntry: null };
  }

  const currentCursor = timeline.cursor;
  const nextCursor = timeline.past.pop() ?? null;

  const nowFn = options.now ?? isoNow;
  const redoEntry: HistoryEntry = {
    id: context.id ?? createId(),
    scope: target.scope,
    refId: target.refId,
    snapshot: context.snapshot,
    createdAt: context.createdAt ?? nowFn(),
    author: context.author,
    origin: context.origin,
    sequence: cache.nextSequence++
  };

  timeline.future.push({ entry: redoEntry, cursor: currentCursor });
  timeline.cursor = nextCursor;

  return { entry: currentCursor, redoEntry };
}

export function redoHistory(cache: HistoryCache, target: HistoryTarget): { entry: HistoryEntry | null } {
  const timeline = ensureTimeline(cache, target);
  const futureEntry = timeline.future.pop();
  if (!futureEntry) {
    return { entry: null };
  }

  if (timeline.cursor) {
    timeline.past.push(timeline.cursor);
  }

  timeline.cursor = futureEntry.cursor;

  return { entry: futureEntry.entry };
}

export function pruneCacheEntries(cache: HistoryCache, pruned: HistoryEntry[]): void {
  if (!pruned.length) {
    return;
  }

  const prunedIds = new Set(pruned.map((entry) => entry.id));

  for (const timeline of cache.timelines.values()) {
    timeline.past = timeline.past.filter((entry) => !prunedIds.has(entry.id));
    timeline.future = timeline.future.filter(
      (item) => !prunedIds.has(item.entry.id) && (!item.cursor || !prunedIds.has(item.cursor.id))
    );

    if (timeline.cursor && prunedIds.has(timeline.cursor.id)) {
      timeline.cursor = timeline.past.pop() ?? null;
    }
  }
}

function isoNow(): IsoDateTimeString {
  return new Date().toISOString();
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function computeNextSequence(history: HistoryEntry[]): number {
  let max = 0;
  for (const entry of history) {
    if (typeof entry.sequence === "number" && entry.sequence > max) {
      max = entry.sequence;
    }
  }
  return max + 1;
}

function ensureTimeline(cache: HistoryCache, target: HistoryTarget): HistoryTimelineState {
  const key = `${target.scope}:${target.refId}`;
  let timeline = cache.timelines.get(key);

  if (!timeline) {
    timeline = {
      scope: target.scope,
      refId: target.refId,
      past: [],
      cursor: null,
      future: []
    } satisfies HistoryTimelineState;
    cache.timelines.set(key, timeline);
  }

  return timeline;
}

function validateHistoryCapture(snapshot: StorageSnapshot, capture: HistoryCaptureInput): void {
  if (capture.scope === HistoryScope.Settings) {
    if (capture.refId !== "settings") {
      throw new Error("settings history entries must target the 'settings' refId");
    }
    return;
  }

  const existsInIndex = snapshot.index.some((entry) => entry.id === capture.refId);
  const existsInDocuments = capture.refId in snapshot.documents;

  if (!existsInIndex && !existsInDocuments) {
    throw new Error(`unknown document id '${capture.refId}' for history capture`);
  }
}

function pruneHistory(
  history: HistoryEntry[],
  config: RuntimeConfiguration,
  nowFn: () => IsoDateTimeString
): { retained: HistoryEntry[]; pruned: HistoryEntry[] } {
  const retentionThreshold =
    config.historyRetentionDays > 0 ? new Date(nowFn()).getTime() - config.historyRetentionDays * MS_PER_DAY : null;
  const retained: HistoryEntry[] = [];
  const pruned: HistoryEntry[] = [];

  for (const entry of history) {
    const createdAt = Date.parse(entry.createdAt);
    if (Number.isNaN(createdAt)) {
      throw new Error(`invalid history timestamp '${entry.createdAt}'`);
    }

    if (retentionThreshold !== null && createdAt < retentionThreshold) {
      pruned.push(entry);
      continue;
    }

    retained.push(entry);
  }

  while (retained.length > config.historyEntryCap) {
    const removed = retained.shift();
    if (removed) {
      pruned.push(removed);
    }
  }

  return { retained, pruned };
}

function createHistoryAuditEntry(
  pruned: HistoryEntry[],
  config: RuntimeConfiguration,
  nowFn: () => IsoDateTimeString
): AuditEntry {
  return {
    id: createId(),
    type: "history.pruned",
    createdAt: nowFn(),
    metadata: {
      count: pruned.length,
      entryCap: config.historyEntryCap,
      retentionDays: config.historyRetentionDays,
      entries: pruned.map((entry) => ({
        id: entry.id,
        refId: entry.refId,
        scope: entry.scope,
        sequence: entry.sequence
      }))
    }
  } satisfies AuditEntry;
}
