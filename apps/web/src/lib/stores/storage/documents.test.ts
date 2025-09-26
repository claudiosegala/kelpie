import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDocument, reorderDocuments, restoreDocument, softDeleteDocument, updateDocument } from "./documents";
import { createInitialSnapshot } from "./defaults";
import { AuditEventType, type DocumentIndexEntry, type DocumentSnapshot, type StorageSnapshot } from "./types";

const BASE_CONFIG = {
  debounce: { writeMs: 500, broadcastMs: 200 },
  historyRetentionDays: 7,
  historyEntryCap: 50,
  auditEntryCap: 20,
  enableAudit: true,
  redactAuditMetadata: false,
  softDeleteRetentionDays: 7,
  quotaWarningBytes: 5_000,
  quotaHardLimitBytes: 10_000,
  gcIdleTriggerMs: 30_000
} as const;

const BASE_SETTINGS = {
  lastActiveDocumentId: "doc-1",
  panes: {},
  filters: {},
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
} as const;

const BASE_INDEX: DocumentIndexEntry[] = [
  {
    id: "doc-1",
    title: "Doc one",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
    purgeAfter: null
  }
];

const BASE_DOCUMENTS: Record<string, DocumentSnapshot> = {
  "doc-1": {
    id: "doc-1",
    title: "Doc one",
    content: "Alpha",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
  }
};

function createSnapshot(overrides: Partial<StorageSnapshot> = {}): StorageSnapshot {
  const base = createInitialSnapshot();
  return {
    ...base,
    ...overrides,
    config: { ...BASE_CONFIG, ...(overrides.config ?? {}) },
    settings: { ...BASE_SETTINGS, ...(overrides.settings ?? {}) },
    index: overrides.index ?? BASE_INDEX.map((entry) => ({ ...entry })),
    documents: overrides.documents ?? { ...BASE_DOCUMENTS },
    history: overrides.history ?? [],
    audit: overrides.audit ?? []
  } satisfies StorageSnapshot;
}

beforeEach(() => {
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn()
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("document mutations", () => {
  it("creates a document and promotes it to the active selection", () => {
    const snapshot = createSnapshot();
    const now = () => "2024-02-01T00:00:00.000Z";
    const randomUUID = vi.mocked(globalThis.crypto.randomUUID);
    randomUUID.mockReturnValueOnce("audit-1").mockReturnValueOnce("audit-2");

    const result = createDocument(snapshot, {
      id: "doc-2",
      title: "Second doc",
      content: "Beta",
      now
    });

    expect(result.documents["doc-2"]).toMatchObject({
      id: "doc-2",
      title: "Second doc",
      content: "Beta",
      createdAt: now(),
      updatedAt: now()
    });
    expect(result.index.map((entry) => entry.id)).toEqual(["doc-1", "doc-2"]);
    expect(result.settings.lastActiveDocumentId).toBe("doc-2");
    expect(result.audit.at(-1)).toMatchObject({
      type: AuditEventType.DocumentCreated,
      metadata: { id: "doc-2", title: "Second doc" }
    });
  });

  it("updates a document and records changed fields", () => {
    const snapshot = createSnapshot();
    const now = () => "2024-02-02T00:00:00.000Z";
    const randomUUID = vi.mocked(globalThis.crypto.randomUUID);
    randomUUID.mockReturnValue("audit-1");

    const result = updateDocument(
      snapshot,
      "doc-1",
      () => ({
        title: "Renamed",
        content: "Gamma",
        lastEditedBy: "user-1"
      }),
      { now }
    );

    expect(result.documents["doc-1"]).toMatchObject({
      title: "Renamed",
      content: "Gamma",
      lastEditedBy: "user-1",
      updatedAt: now()
    });
    expect(result.index[0]).toMatchObject({ title: "Renamed", updatedAt: now() });
    expect(result.settings.updatedAt).toBe(now());
    expect(result.audit.at(-1)).toMatchObject({
      type: AuditEventType.DocumentUpdated,
      metadata: { id: "doc-1", fields: ["title", "content", "lastEditedBy"] }
    });
  });

  it("soft deletes a document and moves selection to the next active entry", () => {
    const snapshot = createSnapshot({
      index: [
        ...BASE_INDEX.map((entry) => ({ ...entry })),
        {
          id: "doc-2",
          title: "Doc two",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        }
      ],
      documents: {
        ...BASE_DOCUMENTS,
        "doc-2": {
          id: "doc-2",
          title: "Doc two",
          content: "Beta",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z"
        }
      }
    });

    const now = () => "2024-03-01T00:00:00.000Z";
    const randomUUID = vi.mocked(globalThis.crypto.randomUUID);
    randomUUID.mockReturnValue("audit-1");

    const result = softDeleteDocument(snapshot, "doc-1", { now });
    expect(result.index[0]).toMatchObject({
      id: "doc-1",
      deletedAt: now(),
      purgeAfter: "2024-03-08T00:00:00.000Z"
    });
    expect(result.settings.lastActiveDocumentId).toBe("doc-2");
    expect(result.audit.at(-1)).toMatchObject({
      type: AuditEventType.DocumentDeleted,
      metadata: { id: "doc-1", purgeAfter: "2024-03-08T00:00:00.000Z" }
    });
  });

  it("restores a document and reactivates it when no selection exists", () => {
    const snapshot = createSnapshot({
      settings: { ...BASE_SETTINGS, lastActiveDocumentId: null },
      index: [
        {
          id: "doc-1",
          title: "Doc one",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: "2024-02-01T00:00:00.000Z",
          purgeAfter: "2024-02-08T00:00:00.000Z"
        }
      ]
    });

    const now = () => "2024-02-05T00:00:00.000Z";
    const randomUUID = vi.mocked(globalThis.crypto.randomUUID);
    randomUUID.mockReturnValue("audit-1");

    const result = restoreDocument(snapshot, "doc-1", { now });
    expect(result.index[0]).toMatchObject({ deletedAt: null, purgeAfter: null, updatedAt: now() });
    expect(result.settings.lastActiveDocumentId).toBe("doc-1");
    expect(result.audit.at(-1)).toMatchObject({ type: AuditEventType.DocumentRestored, metadata: { id: "doc-1" } });
  });

  it("reorders active documents and leaves deleted ones in place", () => {
    const snapshot = createSnapshot({
      index: [
        {
          id: "doc-1",
          title: "Doc one",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        },
        {
          id: "doc-2",
          title: "Doc two",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        },
        {
          id: "doc-3",
          title: "Doc three",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: "2024-02-01T00:00:00.000Z",
          purgeAfter: "2024-02-08T00:00:00.000Z"
        }
      ]
    });

    const now = () => "2024-03-10T00:00:00.000Z";
    const randomUUID = vi.mocked(globalThis.crypto.randomUUID);
    randomUUID.mockReturnValue("audit-1");

    const result = reorderDocuments(snapshot, ["doc-2", "doc-1"], { now });
    expect(result.index.map((entry) => entry.id)).toEqual(["doc-2", "doc-1", "doc-3"]);
    expect(result.audit.at(-1)).toMatchObject({
      type: AuditEventType.DocumentReordered,
      metadata: { before: ["doc-1", "doc-2"], after: ["doc-2", "doc-1"] }
    });
  });

  it("trims the audit log to the configured cap when appending entries", () => {
    const snapshot = createSnapshot({
      config: {
        ...BASE_CONFIG,
        auditEntryCap: 2
      },
      audit: [
        {
          id: "audit-1",
          type: AuditEventType.DocumentCreated,
          createdAt: "2024-01-01T00:00:00.000Z",
          metadata: { id: "doc-0" }
        },
        {
          id: "audit-2",
          type: AuditEventType.DocumentUpdated,
          createdAt: "2024-01-02T00:00:00.000Z",
          metadata: { id: "doc-1", fields: ["title"] }
        }
      ]
    });

    const now = () => "2024-02-10T00:00:00.000Z";
    const randomUUID = vi.mocked(globalThis.crypto.randomUUID);
    randomUUID.mockReturnValue("audit-3");

    const result = createDocument(snapshot, {
      id: "doc-2",
      title: "Doc three",
      content: "Gamma",
      now
    });

    expect(result.audit).toHaveLength(2);
    expect(result.audit[0]?.id).toBe("audit-2");
    expect(result.audit[1]).toMatchObject({
      id: "audit-3",
      type: AuditEventType.DocumentCreated,
      metadata: { id: "doc-2", title: "Doc three" }
    });
  });

  it("validates reorder payloads", () => {
    const snapshot = createSnapshot({
      index: [
        {
          id: "doc-1",
          title: "Doc one",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        },
        {
          id: "doc-2",
          title: "Doc two",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          deletedAt: null,
          purgeAfter: null
        }
      ]
    });

    expect(() => reorderDocuments(snapshot, ["doc-2", "doc-2"])).toThrow(
      "document reorder payload contains duplicate id 'doc-2'"
    );
    expect(() => reorderDocuments(snapshot, ["doc-2"])).toThrow(
      "document reorder payload must include every active document exactly once"
    );
    expect(() => reorderDocuments(snapshot, ["doc-2", "doc-3"])).toThrow(
      "cannot reorder unknown or inactive document 'doc-3'"
    );
  });
});
