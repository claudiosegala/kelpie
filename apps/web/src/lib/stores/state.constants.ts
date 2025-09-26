import type { DocumentIndexEntry, DocumentSnapshot } from "./storage";

export const PRIMARY_DOCUMENT_ID = "kelpie-primary-document" as const;
export const PRIMARY_DOCUMENT_TITLE = "My tasks" as const;

export const DEFAULT_DOCUMENT_CONTENT = `# Welcome to Kelpie 🧭

Kelpie keeps your Markdown to-dos editable anywhere while the app reflects every change in real-time. Use it as a playground to
learn how Markdown tasks, metadata, and filters come together.

## Try the guided tour

- [ ] Take the welcome tour _(toggle this to see instant syncing)_
  - [ ] Edit this sub-task in your editor and watch Kelpie follow along
- [ ] Add scheduling metadata @due(2024-07-01) @priority(A)
- [ ] Explore repeating tasks @repeat(1w)
- [ ] Tag workstreams with #planning #inbox
- [ ] Mark something done and note the timestamp @done(2024-06-01T09:00:00Z)

> Tip: Paste additional Markdown below to experiment—Kelpie renders a split-pane editor and preview so you can iterate quickly.`;

export function createPrimaryDocument(timestamp: string): DocumentSnapshot {
  return {
    id: PRIMARY_DOCUMENT_ID,
    title: PRIMARY_DOCUMENT_TITLE,
    content: DEFAULT_DOCUMENT_CONTENT,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function createIndexEntryFromDocument(document: DocumentSnapshot): DocumentIndexEntry {
  return {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    deletedAt: null,
    purgeAfter: null
  };
}
