import { derived } from "svelte/store";
import { parseMarkdown, formatTask, type Task } from "../parsing/parseTask";
import { markError, markSaved, markSaving } from "./persistence";
import { createStorageEngine, type DocumentIndexEntry, type DocumentSnapshot, type StorageSnapshot } from "./storage";

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

const defaultFile = `- [ ] Buy milk @due(2025-10-31) #groceries
- [x] Wash car @done(2025-09-01)`;

const PRIMARY_DOCUMENT_ID = "kelpie-primary-document";
const PRIMARY_DOCUMENT_TITLE = "My tasks";

const storage = createStorageEngine();

function ensurePrimaryDocument(snapshot: StorageSnapshot): StorageSnapshot {
  const now = new Date().toISOString();
  let documents = snapshot.documents;
  let index = snapshot.index;
  let settings = snapshot.settings;
  let changed = false;

  const activeId = settings.lastActiveDocumentId;
  let targetId = PRIMARY_DOCUMENT_ID;

  if (typeof activeId === "string" && documents[activeId]) {
    targetId = activeId;
  }

  if (!documents[targetId]) {
    const createdAt = now;
    const document: DocumentSnapshot = {
      id: targetId,
      title: PRIMARY_DOCUMENT_TITLE,
      content: defaultFile,
      createdAt,
      updatedAt: createdAt
    };
    documents = { ...documents, [targetId]: document };
    changed = true;
  }

  const resolvedDocument = documents[targetId];
  if (!resolvedDocument) {
    return snapshot;
  }
  const entryIndex = index.findIndex((entry) => entry.id === targetId);

  if (entryIndex === -1) {
    const entry: DocumentIndexEntry = {
      id: targetId,
      title: resolvedDocument.title,
      createdAt: resolvedDocument.createdAt,
      updatedAt: resolvedDocument.updatedAt,
      deletedAt: null,
      purgeAfter: null
    };
    index = [...index, entry];
    changed = true;
  } else {
    const currentEntry = index[entryIndex]!;
    const shouldRestore =
      currentEntry.deletedAt !== null ||
      currentEntry.purgeAfter !== null ||
      currentEntry.title !== resolvedDocument.title;
    if (shouldRestore) {
      const updatedEntry: DocumentIndexEntry = {
        ...currentEntry,
        title: resolvedDocument.title,
        updatedAt: resolvedDocument.updatedAt,
        deletedAt: null,
        purgeAfter: null
      };
      index = [...index.slice(0, entryIndex), updatedEntry, ...index.slice(entryIndex + 1)];
      changed = true;
    }
  }

  if (settings.lastActiveDocumentId !== targetId) {
    settings = { ...settings, lastActiveDocumentId: targetId, updatedAt: now };
    changed = true;
  } else if (changed) {
    settings = { ...settings, updatedAt: now };
  }

  return changed
    ? {
        ...snapshot,
        documents,
        index,
        settings
      }
    : snapshot;
}

storage.update(ensurePrimaryDocument);

export const appState = derived(storage.snapshot, ($snapshot): PersistedState => {
  const activeId = $snapshot.settings.lastActiveDocumentId ?? PRIMARY_DOCUMENT_ID;
  const activeDocument = $snapshot.documents[activeId];

  return {
    documentId: activeId,
    file: activeDocument?.content ?? defaultFile,
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

    if (t.lineIndex < 0 || t.lineIndex >= lines.length) {
      return document;
    }

    const updated: Task = {
      id: t.id,
      raw: t.raw,
      title: t.title,
      tags: t.tags,
      checked: !t.checked,
      lineIndex: t.lineIndex
    };

    lines[t.lineIndex] = formatTask(updated);

    return { ...document, content: lines.join("\n") };
  });
}
