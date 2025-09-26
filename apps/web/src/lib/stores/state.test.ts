import { get, writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentSnapshot, StorageSnapshot } from "./storage";
import { parseMarkdown } from "../parsing/parseTask";

const BASE_TIMESTAMP = "2024-01-01T00:00:00.000Z";

function createSnapshot(overrides: Partial<StorageSnapshot> = {}): StorageSnapshot {
  const base: StorageSnapshot = {
    meta: {
      version: 1,
      installationId: "test-installation",
      createdAt: BASE_TIMESTAMP,
      lastOpenedAt: BASE_TIMESTAMP
    },
    config: {
      debounce: { writeMs: 200, broadcastMs: 200 },
      historyRetentionDays: 7,
      historyEntryCap: 50,
      auditEntryCap: 20,
      softDeleteRetentionDays: 7
    },
    settings: {
      lastActiveDocumentId: null,
      panes: {},
      filters: {},
      createdAt: BASE_TIMESTAMP,
      updatedAt: BASE_TIMESTAMP
    },
    index: [],
    documents: {},
    history: [],
    audit: []
  };

  return {
    ...base,
    ...overrides,
    config: { ...base.config, ...(overrides.config ?? {}) },
    settings: { ...base.settings, ...(overrides.settings ?? {}) },
    index: overrides.index ?? base.index,
    documents: overrides.documents ?? base.documents,
    history: overrides.history ?? base.history,
    audit: overrides.audit ?? base.audit
  };
}

function createDocument(overrides: Partial<DocumentSnapshot> = {}): DocumentSnapshot {
  const base: DocumentSnapshot = {
    id: "kelpie-primary-document",
    title: "My tasks",
    content: "- [ ] Sample",
    createdAt: BASE_TIMESTAMP,
    updatedAt: BASE_TIMESTAMP
  };

  return { ...base, ...overrides };
}

let snapshotValue: StorageSnapshot = createSnapshot();
const snapshotStore = writable<StorageSnapshot>(snapshotValue);
const configStore = writable(snapshotValue.config);
const settingsStore = writable(snapshotValue.settings);
let nextUpdateError: Error | null = null;

function setSnapshot(next: StorageSnapshot): void {
  snapshotValue = next;
  snapshotStore.set(next);
  configStore.set(next.config);
  settingsStore.set(next.settings);
}

function getSnapshot(): StorageSnapshot {
  return snapshotValue;
}

function defaultUpdateImpl(updater: (snapshot: StorageSnapshot) => StorageSnapshot): boolean {
  if (nextUpdateError) {
    const error = nextUpdateError;
    nextUpdateError = null;
    throw error;
  }
  const next = updater(snapshotValue);
  if (!next) {
    throw new Error("storage.update must return a snapshot");
  }
  if (next !== snapshotValue) {
    setSnapshot(next);
    return true;
  }
  return false;
}

const updateMock = vi.fn((updater: (snapshot: StorageSnapshot) => StorageSnapshot) => defaultUpdateImpl(updater));

const createStorageEngineMock = vi.fn(() => ({
  snapshot: { subscribe: snapshotStore.subscribe },
  config: { subscribe: configStore.subscribe },
  settings: { subscribe: settingsStore.subscribe },
  update: (updater: (snapshot: StorageSnapshot) => StorageSnapshot) => updateMock(updater),
  refresh: vi.fn(),
  reset: vi.fn()
}));

const markSaving = vi.fn();
const markSaved = vi.fn();
const markError = vi.fn();

vi.mock("./storage", () => ({
  createStorageEngine: createStorageEngineMock
}));

vi.mock("./persistence", () => ({
  markSaving: (...args: unknown[]) => markSaving(...args),
  markSaved: (...args: unknown[]) => markSaved(...args),
  markError: (...args: unknown[]) => markError(...args)
}));

describe("state store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    setSnapshot(createSnapshot());
    nextUpdateError = null;
    updateMock.mockImplementation((updater) => defaultUpdateImpl(updater));
    updateMock.mockClear();
    createStorageEngineMock.mockClear();
    markSaving.mockClear();
    markSaved.mockClear();
    markError.mockClear();
  });

  it("ensures the primary document exists on startup", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T12:00:00Z"));

    const { appState } = await import("./state");

    expect(createStorageEngineMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);

    const snapshot = getSnapshot();
    expect(snapshot.settings.lastActiveDocumentId).toBe("kelpie-primary-document");
    expect(snapshot.documents["kelpie-primary-document"]).toBeTruthy();
    expect(snapshot.index).toHaveLength(1);

    const stateValue = get(appState);
    expect(stateValue.documentId).toBe("kelpie-primary-document");
    expect(stateValue.file).toContain("Welcome to Kelpie");
  });

  it("updates the active document content while tracking persistence status", async () => {
    const document = createDocument({ content: "- [ ] Buy milk" });
    const snapshot = createSnapshot({
      documents: { [document.id]: document },
      index: [
        {
          id: document.id,
          title: document.title,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          deletedAt: null,
          purgeAfter: null
        }
      ],
      settings: {
        lastActiveDocumentId: document.id,
        panes: {},
        filters: {},
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP
      }
    });
    setSnapshot(snapshot);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-07-01T09:30:00Z"));

    const { setDocumentContent } = await import("./state");

    setDocumentContent("- [ ] Buy oat milk");

    const updated = getSnapshot().documents[document.id]!;
    expect(markSaving).toHaveBeenCalledTimes(1);
    expect(updated.content).toBe("- [ ] Buy oat milk");
    expect(updated.updatedAt).toBe(new Date("2024-07-01T09:30:00Z").toISOString());

    await Promise.resolve();

    expect(markSaved).toHaveBeenCalledTimes(1);
    expect(markError).not.toHaveBeenCalled();
  });

  it("queues an error when storage update fails", async () => {
    const document = createDocument();
    const snapshot = createSnapshot({
      documents: { [document.id]: document },
      index: [
        {
          id: document.id,
          title: document.title,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          deletedAt: null,
          purgeAfter: null
        }
      ],
      settings: {
        lastActiveDocumentId: document.id,
        panes: {},
        filters: {},
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP
      }
    });
    setSnapshot(snapshot);

    const { setDocumentContent } = await import("./state");

    const failure = new Error("write failed");
    nextUpdateError = failure;

    expect(() => setDocumentContent("- [ ] Updated")).not.toThrow();
    expect(markSaving).toHaveBeenCalledTimes(1);
    expect(markError).toHaveBeenCalledWith(failure);
    expect(markSaved).not.toHaveBeenCalled();
  });

  it("parses tasks from the active document and toggles completion", async () => {
    const content = "- [ ] Buy milk\n- [x] Wash car";
    const document = createDocument({ content });
    const snapshot = createSnapshot({
      documents: { [document.id]: document },
      index: [
        {
          id: document.id,
          title: document.title,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          deletedAt: null,
          purgeAfter: null
        }
      ],
      settings: {
        lastActiveDocumentId: document.id,
        panes: {},
        filters: {},
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP
      }
    });
    setSnapshot(snapshot);

    const expectedTasks = parseMarkdown(content);
    const targetTaskId = expectedTasks[0]!.id;

    const { tasks, toggleTask } = await import("./state");

    expect(get(tasks)).toEqual(expectedTasks);

    toggleTask(targetTaskId);

    const updatedContent = getSnapshot().documents[document.id]!.content;
    expect(updatedContent.split("\n")[0]).toBe("- [x] Buy milk");
    await Promise.resolve();
    expect(markSaved).toHaveBeenCalled();
  });
});
