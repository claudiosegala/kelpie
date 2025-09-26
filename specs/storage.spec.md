# App Web Storage Spec

## 1. Introduction

This document describes the design of the local storage layer.
The storage layer is responsible for persisting documents (Markdown “tabs”) and UI settings on the client, with support for undo/redo, multi-tab sync, and schema migration.

This specification does **not** prescribe implementation details or code, but defines the expected behavior, boundaries, and responsibilities.

## 2. Outcomes

From the perspective of the end user:

- A user can close their browser and return later to find documents and settings exactly as they left them.
- A user can undo changes to a document (via Command+Z).
- Deleting a document will not erase it immediately; it remains recoverable for 7 days.
- Changes made in one tab appear in another tab of the same browser when switching between them.
- The app never corrupts or partially saves a document: writes are either complete or fail.

From the perspective of developers:

- Configuration, documents, settings, history, and audit are persisted consistently.
- Undo/redo timelines are stored for both documents and settings (though settings undo is not exposed yet).
- Storage behavior is inspectable and resettable in development.

## 3. Goals

- Persist documents and settings **locally and indefinitely**.
- Support **undo/redo** history (separate for docs and settings).
- Provide **multi-tab sync** within the same browser.
- Guarantee **all-or-nothing writes** (never partial).
- Use **schema versioning** with migrations.
- Expose a clear **API surface** for the application and developers.
- Be prepared for future features such as encryption, backups, and error UX.

## 4. Scope

- In scope (MVP):
  - Local persistence (via browser storage)
  - Separate namespaces for docs, settings, configuration
  - Undo/redo snapshots (not diffs)
  - Audit trail (basic activity log with author + timestamp)
  - Soft deletes with dynamic garbage collection
  - Multi-tab sync (last-write-wins, sync on tab switch)
  - Developer inspector and reset utilities

- Out of scope (MVP, future work):
  - UX for error handling (banners, modals, warnings)
  - Import/export and backup mechanisms
  - Undo/redo for settings exposed via keyboard shortcuts
  - Restore tutorial doc flow
  - Encryption or minification

## 5. Data Entities

Storage manages several categories of data.

- **Meta Information**
  - Contains schema version, installation ID, created and last opened timestamps.
  - Used to detect migrations and corruption recovery.

- **Configuration**
  - Runtime tunables such as debounce intervals, history retention days, and maximum audit size.
  - Does not include environment-level flags (e.g. encryption).
  - Defaults are bundled and persisted, but may be inspected and surfaced to developers.

- **Settings**
  - Stores UI state such as which panels are collapsed and the last active tab.
  - Includes timestamps for creation and updates.

- **Docs Index**
  - List of all document IDs and their ordering.
  - Each entry includes creation and update timestamps, and soft-delete markers.

- **Document**
  - A Markdown content entry with title, ID, timestamps, and optional “last edited by” metadata.

- **History Buffers**
  - Separate history for documents and settings.
  - Stored as snapshots with timestamps and author.
  - Retention is based on time (e.g. 7 days) and capped entry counts.

- **Audit Trail**
  - Records actions (create, update, delete, migration, corruption).
  - Includes timestamp, author, type, and optional metadata.
  - Retained up to a configured maximum number of entries.

## 6. Garbage Collection

- **Soft deletes**:
  - A deleted doc is marked with a deletion timestamp and a purge date (7 days later).

- **Dynamic purge**:
  - Triggered when storage approaches quota.
  - First purges expired soft-deletes, then oldest history entries.
  - Purging is silent (no user notifications in MVP).

- **All-or-nothing guarantee**:
  - A write that cannot fully fit must fail entirely.
  - No partial or truncated writes are allowed.
  - In such a case, an unrecoverable error is raised internally.

## 7. History & Undo/Redo

- **Separate timelines** for documents and settings.
- Document undo/redo is exposed (keyboard shortcuts).
- Settings undo/redo is stored but not exposed in MVP; to be surfaced later.
- Snapshots only (diffs may come later).
- Undo/redo is per-scope only, not global.
- History is automatically purged beyond retention windows or caps.

## 8. Writes & Sync

- **Debounced writes**: changes are persisted after a short inactivity period (default 2s).
- **Debounced UI propagation**: updates are pushed to UI after a shorter debounce (default 1s).
- **Atomicity**: each write must succeed fully or fail completely.
- **Multi-tab sync**:
  - Sync events are triggered on tab switch.
  - Last-write-wins resolution.
  - No conflict resolution beyond this in MVP.

## 9. Error Handling & UX

- MVP: errors are not surfaced to the end user.
- Errors are logged internally for developers.
- Future work:
  - UX for quota exceeded, corruption, or near-limit warnings.
  - Strict developer mode where all errors throw.
  - Tools to restore default tutorial doc or purge old history interactively.

## 10. Audit Trail

- All meaningful actions are recorded: document lifecycle, settings updates, migrations, corruption events.
- Entries include timestamp, type, author, and optional metadata.
- End-users can access a basic activity log.
- Developers can inspect full detail in the Inspector.
- The audit log is capped in size.

## 11. API Structure

The storage layer exposes a conceptual API.
This API is descriptive: exact function names and signatures are implementation details, but the **responsibilities and contracts** must be respected.

- **Boot & Initialization**
  - Load persisted state, validate, and run migrations if needed.
  - Seed defaults on first run (including tutorial doc).

- **Configuration**
  - Retrieve current configuration values.
  - Update configuration values (where supported).

- **Documents**
  - Create, read, update, soft-delete, and restore documents.
  - List all documents and their metadata.

- **Settings**
  - Retrieve current settings.
  - Update settings.

- **History**
  - Record snapshots into history.
  - Undo and redo changes (separate for docs and settings).

- **Audit**
  - Record audit entries.
  - Retrieve entries for activity log or Inspector.

- **Maintenance & Utilities**
  - Run garbage collection.
  - Reset all storage.
  - Simulate first run.
  - Inspect current storage state.

- **Sync**
  - Broadcast changes across tabs.
  - Receive changes and apply last-write-wins.

## 12. Developer Experience

- Inspector panel with parsed view of storage, history, and audit.
- Utilities for reset, purge, simulate first run.
- Console logging: debug in development, silent in production.

## 13. Example Scenarios

These scenarios serve both as documentation and as test case inspiration:

1. **User reopens the app**:
   - Documents and settings appear exactly as left.

2. **User deletes a doc**:
   - The doc disappears from the index.
   - It is recoverable for 7 days.

3. **User edits in two tabs**:
   - The last saved tab wins.
   - No conflicts or merges are attempted.

4. **Undo a doc change**:
   - Pressing Command+Z reverts to the last snapshot.

5. **Quota is exceeded**:
   - Attempted write fails entirely.
   - No partial or corrupted data is written.

## 14. Open Questions & Assumptions

- Exact UX for handling storage full or corruption errors.
- Whether to add warnings when approaching quota.
- If settings undo/redo should eventually be merged into a global timeline.
- Whether to implement import/export before backups, or vice versa.

## 15. Storage Engine Contract

The storage engine orchestrates persistence and read models for the rest of the app.

- **Initialization**
  - On boot, the engine loads the latest snapshot from the driver; if none is present it seeds defaults generated by `createInitialSnapshot`.
  - All public Svelte stores (`snapshot`, `config`, `settings`) are derived from the same hydrated snapshot reference to guarantee consistency.

- **Refreshes**
  - `refresh()` re-reads from the driver and only applies changes when the driver returns a non-null snapshot.
  - External driver subscriptions trigger the same refresh flow to keep multiple tabs or dev tools in sync.

- **Resets**
  - `reset()` replaces the entire snapshot with a fresh default instance, persists it immediately, and re-emits derived stores.
  - Resetting always recreates configuration defaults even if the previous snapshot had custom values, ensuring a “factory reset”.

- **Updates**
  - `update(updater)` invokes `updater` with the latest in-memory snapshot and expects a **complete snapshot object** in return.
  - If the updater returns `null`/`undefined`, the engine throws an error and leaves state untouched, preventing partial writes.
  - When the updater returns the **same reference**, no persistence occurs, but derived stores still reflect in-place mutations.
  - When a **new snapshot reference** is returned, it is first published to the in-memory store and then saved via the driver (all-or-nothing).
  - After every successful update, the `config` and `settings` stores are synchronized with the latest snapshot fields.

- **Broadcasts**
  - `scheduleBroadcast` is currently a stub that preserves the contract surface; future work will hook this into `BroadcastChannel` (or similar).

## 16. AI Handoff & Test Tracking

This section is for the AI or developers to update after implementation runs.

- **Where this logic lives**:
  - `/apps/web/src/lib/stores/`

- **What has been implemented**:
  - Storage schema types and defaults scaffolding (`apps/web/src/lib/stores/storage/*`)
  - Local storage driver wrapper with subscription hook
  - Initial storage engine exposing read-only Svelte stores and reset/refresh utilities

- **What remains to be implemented**:
  - Document/index/settings mutation APIs and undo/redo history management
  - Audit logging, garbage collection, and multi-tab broadcast channel
  - Migration, corruption handling, and developer inspector utilities

- **Test files and coverage**:
  - Unit tests for storage engine hydration, refresh, reset, and update semantics: `/apps/web/src/lib/stores/storage/engine.test.ts`
  - Unit tests for history eviction: `/apps/web/src/lib/stores/storage-history.test.ts`
  - Unit tests for Migration tests: `/apps/web/src/lib/stores/storage-migration.test.ts`
  - Unit tests for Sync tests (multi-tab): `/apps/web/src/lib/stores/storage-sync.test.ts`
  - Unit tests for Garbage collection tests: `/apps/web/src/lib/stores/storage-gc.test.ts`
  - Unit tests for Audit log tests: `/apps/web/src/lib/stores/storage-audit.test.ts`

This section is continuously updated as progress is made.
