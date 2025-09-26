import { derived } from "svelte/store";
import { parseMarkdown, formatTask, type Task } from "../parsing/parseTask";
import { markError, markSaved, markSaving } from "./persistence";
import {
  DEFAULT_DOCUMENT_CONTENT,
  PRIMARY_DOCUMENT_ID,
  PRIMARY_DOCUMENT_TITLE,
  createIndexEntryFromDocument,
  createPrimaryDocument
} from "./state.constants";
import { createStorageEngine, type DocumentSnapshot, type StorageSnapshot, type UiSettings } from "./storage";

export type PersistedState = {
  documentId: string;
  file: string;
  ui: {
    panes: Record<string, boolean>;
    activeFilters: Record<string, unknown>;
  };
  meta: {
    version: number;
    documentTitle: string;
    documentUpdatedAt: string | null;
  };
};

const storage = createStorageEngine();

function resolveActiveDocumentId(snapshot: StorageSnapshot): string {
  const activeId = snapshot.settings.lastActiveDocumentId;
  if (typeof activeId === "string" && snapshot.documents[activeId]) {
    return activeId;
  }
  return PRIMARY_DOCUMENT_ID;
}

function ensureDocument(
  documents: StorageSnapshot["documents"],
  targetId: string,
  timestamp: string
): { documents: StorageSnapshot["documents"]; document: DocumentSnapshot; changed: boolean } {
  const existing = documents[targetId];
  if (existing) {
    return { documents, document: existing, changed: false };
  }

  // At this point the caller resolved the active id to the primary document.
  const created = createPrimaryDocument(timestamp);
  return {
    documents: { ...documents, [targetId]: created },
    document: created,
    changed: true
  };
}

function ensureIndex(
  index: StorageSnapshot["index"],
  document: DocumentSnapshot
): { index: StorageSnapshot["index"]; changed: boolean } {
  const entryIndex = index.findIndex((entry) => entry.id === document.id);

  if (entryIndex === -1) {
    return { index: [...index, createIndexEntryFromDocument(document)], changed: true };
  }

  const currentEntry = index[entryIndex]!;
  const shouldRestore =
    currentEntry.deletedAt !== null || currentEntry.purgeAfter !== null || currentEntry.title !== document.title;

  if (!shouldRestore) {
    return { index, changed: false };
  }

  const updatedEntry = {
    ...currentEntry,
    title: document.title,
    updatedAt: document.updatedAt,
    deletedAt: null,
    purgeAfter: null
  };

  return {
    index: [...index.slice(0, entryIndex), updatedEntry, ...index.slice(entryIndex + 1)],
    changed: true
  };
}

function ensureSettings(
  settings: UiSettings,
  targetId: string,
  timestamp: string,
  hasOtherChanges: boolean
): { settings: UiSettings; changed: boolean } {
  if (settings.lastActiveDocumentId !== targetId) {
    return {
      settings: { ...settings, lastActiveDocumentId: targetId, updatedAt: timestamp },
      changed: true
    };
  }

  if (!hasOtherChanges) {
    return { settings, changed: false };
  }

  return {
    settings: { ...settings, updatedAt: timestamp },
    changed: true
  };
}

function ensurePrimaryDocument(snapshot: StorageSnapshot): StorageSnapshot {
  const now = new Date().toISOString();
  const targetId = resolveActiveDocumentId(snapshot);

  const { documents, document, changed: documentsChanged } = ensureDocument(snapshot.documents, targetId, now);

  const { index, changed: indexChanged } = ensureIndex(snapshot.index, document);
  const { settings, changed: settingsChanged } = ensureSettings(
    snapshot.settings,
    targetId,
    now,
    documentsChanged || indexChanged
  );

  if (!documentsChanged && !indexChanged && !settingsChanged) {
    return snapshot;
  }

  return {
    ...snapshot,
    documents,
    index,
    settings
  };
}

storage.update(ensurePrimaryDocument);

export const appState = derived(storage.snapshot, ($snapshot): PersistedState => {
  const activeId = $snapshot.settings.lastActiveDocumentId ?? PRIMARY_DOCUMENT_ID;
  const activeDocument = $snapshot.documents[activeId];

  return {
    documentId: activeId,
    file: activeDocument?.content ?? DEFAULT_DOCUMENT_CONTENT,
    ui: {
      panes: $snapshot.settings.panes,
      activeFilters: $snapshot.settings.filters
    },
    meta: {
      version: $snapshot.meta.version,
      documentTitle: activeDocument?.title ?? PRIMARY_DOCUMENT_TITLE,
      documentUpdatedAt: activeDocument?.updatedAt ?? null
    }
  };
});

/**
 * Derived store: parse tasks from Markdown file.
 */
export const tasks = derived(appState, ($s) => parseMarkdown($s.file));

function commitUpdate(updater: (snapshot: StorageSnapshot) => StorageSnapshot): void {
  markSaving();
  try {
    storage.update(updater);
    queueMicrotask(markSaved);
  } catch (error) {
    markError(error);
  }
}

function updateActiveDocument(
  reducer: (document: DocumentSnapshot, snapshot: StorageSnapshot) => DocumentSnapshot
): void {
  commitUpdate((snapshot) => {
    const documentId = snapshot.settings.lastActiveDocumentId ?? PRIMARY_DOCUMENT_ID;
    const existing = snapshot.documents[documentId];

    if (!existing) {
      return snapshot;
    }

    const nextDocument = reducer(existing, snapshot);
    if (nextDocument === existing) {
      return snapshot;
    }

    const now = new Date().toISOString();
    const documentWithTimestamps: DocumentSnapshot = {
      ...existing,
      ...nextDocument,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now
    };

    const updatedIndex = snapshot.index.map((entry) =>
      entry.id === documentId
        ? {
            ...entry,
            title: documentWithTimestamps.title,
            updatedAt: now,
            deletedAt: null,
            purgeAfter: null
          }
        : entry
    );

    return {
      ...snapshot,
      documents: { ...snapshot.documents, [documentId]: documentWithTimestamps },
      index: updatedIndex,
      settings: { ...snapshot.settings, updatedAt: now }
    };
  });
}

export function setDocumentContent(content: string): void {
  updateActiveDocument((document) => {
    if (document.content === content) {
      return document;
    }
    return { ...document, content };
  });
}

/**
 * Toggle a task's checked state by id.
 */
export function toggleTask(id: string): void {
  updateActiveDocument((document) => {
    const lines = document.content.split(/\r?\n/);
    const parsed = parseMarkdown(document.content);
    const idx = parsed.findIndex((t) => t.id === id);

    if (idx === -1) {
      return document; // nothing to toggle
    }

    const t = parsed[idx];
    if (!t) {
      return document; // extra guard (strict mode safe)
    }

    const toggled = { ...t, checked: !t.checked } satisfies Task;
    const updatedLine = formatTask(toggled);
    lines[t.lineIndex] = updatedLine;

    return { ...document, content: lines.join("\n") };
  });
}
