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

## 16. Snapshot Schema & Invariants

The persisted snapshot is a single JSON object written atomically via the driver.
This section enumerates the required fields and the invariants that updates must
preserve.

- **`meta`**
  - `version` matches the storage schema version defined in code. Bumping this
    value requires a migration entry (see §20).
  - `installationId` is a UUID that never changes for the lifetime of the
    install. Regenerated only on full reset.
  - `createdAt` is the timestamp of the initial seed; `lastOpenedAt` is updated
    on every boot before any other mutations are processed.
  - `migratedFrom` is optional and records the previous schema version after a
    successful migration.

- **`config`**
  - Contains runtime tunables. All values must be serialisable primitives to
    keep the snapshot deterministic.
  - `debounce.writeMs` and `debounce.broadcastMs` are positive integers.
  - Caps (`historyEntryCap`, `auditEntryCap`) must be ≥ the number of required
    seed entries to avoid trimming defaults.

- **`settings`**
  - `lastActiveDocumentId` is `null` only when the index is empty. When a
    document exists it must reference an `index` entry that is not soft-deleted.
  - `panes` and `filters` are JSON-serialisable maps. Future settings must
    follow the same constraint.
  - `createdAt` never changes; `updatedAt` is bumped on each settings mutation.

- **`index`**
  - Ordered array defining the display order of documents. Each entry's `id`
    must correspond to a key in the `documents` map.
  - `deletedAt` is `null` for active docs and populated for soft-deleted docs.
    When populated, `purgeAfter` MUST be set to `deletedAt + retentionDays`.
  - Only active documents participate in default selection and navigation.

- **`documents`**
  - Map keyed by document ID. Missing keys for entries in the index are treated
    as corruption and should trigger recovery (future work).
  - `updatedAt` reflects the last persisted mutation. Implementations should
    avoid mutating timestamps unless a change actually occurred.

- **`history`**
  - Append-only array ordered by `createdAt`. Entries beyond retention caps are
    pruned from the front.
  - `scope` is either `document` or `settings`. When `document`, `refId` must be
    a valid doc ID (even if the doc is soft-deleted). When `settings`, `refId`
    MUST equal the literal string `"settings"`.
  - `snapshot` stores the complete serialised payload needed to restore state.

- **`audit`**
  - Append-only array ordered by `createdAt`. Oldest entries are pruned first.
  - Each entry's `type` uses the taxonomy defined in §5. Metadata is arbitrary
    JSON but should remain small (≤ 2 KB) to avoid quota pressure.

Updates that violate these invariants must throw and leave the snapshot
untouched.

## 17. Document Lifecycle & Operations

Document APIs expose the following behaviours:

- **Creation**
  - Generates a UUID for the document ID.
  - Inserts a `DocumentIndexEntry` at the requested position (default: end).
  - Creates an accompanying document snapshot with seeded content and matching
    timestamps.
  - Appends audit event `document.created` and history snapshot capturing the
    initial state.

- **Update**
  - Accepts partial payloads for title/content but always writes a full snapshot
    to storage.
  - Bumps `updatedAt` and, when applicable, `lastEditedBy`.
  - Enqueues a history snapshot prior to persisting the change so undo restores
    the previous state.

- **Soft Delete**
  - Sets `deletedAt` to now and `purgeAfter` to `now + retention`.
  - Removes the document ID from default selection flows; if the deleted doc was
    active, selection moves to the next non-deleted entry.
  - Appends audit event `document.deleted` and history snapshot.

- **Restore**
  - Clears `deletedAt` and `purgeAfter`.
  - Reinserts the document at its previous index position.
  - Emits audit event `document.restored`.

- **Reorder**
  - Supports drag/drop style reorderings by accepting a new ordered list of IDs.
  - Updates only the `index` array; documents retain their metadata.
  - Emits audit event `document.updated` to track the change.

- **Purge**
  - Triggered by garbage collection when `purgeAfter` is in the past.
  - Permanently removes the index entry, document snapshot, and associated
    history entries.
  - Adds audit events for both the purge and history pruning.

All operations must be debounced via the write scheduler (default 2s) but can be
forced immediately by developer utilities (e.g., reset).

## 18. History Management

Undo/redo relies on explicit snapshot captures. The spec mandates:

- **Capture strategy**
  - Before each mutation, persist a snapshot of the target scope (doc/settings).
  - Snapshots contain the minimal JSON required to restore state; for documents
    this includes `title`, `content`, and timestamps.

- **Timelines**
  - Separate stacks per document plus a shared stack for settings. Undoing a doc
    change only affects that document's history.
  - Each timeline tracks `cursor` state so redo is possible until another write
    occurs.

- **Retention**
  - History older than `historyRetentionDays` or beyond `historyEntryCap` is
    trimmed FIFO. Trimming records an audit entry of type `history.pruned`.

- **Undo/Redo mechanics**
  - Undo pops the previous snapshot, writes it to storage, and pushes the current
    state onto the redo stack.
  - Redo pops from the redo stack and applies it similarly.
  - Calling undo when no history exists is a no-op.

History operations must be atomic with the associated document/settings write so
that the snapshot and history remain consistent.

## 19. Multi-Tab Synchronisation

Multi-tab support hinges on the driver subscription hook and broadcast events.

- **Event triggers**
  - Local writes enqueue a `StorageBroadcast` with `origin: "local"` and scope
    derived from the mutation (document/settings/config/etc.).
  - On tab focus change, the app explicitly calls `refresh()` to capture any
    missed writes.

- **Receiving updates**
  - When the driver signals an external change, the engine reloads the full
    snapshot via `refresh()` and compares timestamps to determine if UI stores
    need to emit.
  - Last-write-wins: whichever tab persisted last overwrites local in-memory
    state. No merge attempts are made.

- **Broadcast channel (future)**
  - `scheduleBroadcast` will post messages through `BroadcastChannel` once
    implemented. The API shape is frozen to avoid breaking changes.

- **Edge cases**
  - Tabs detecting schema version mismatches must force a refresh and prompt for
    migration handling (future UX).
  - Throttling ensures repeated writes within `debounce.broadcastMs` are
    coalesced into a single broadcast event.

## 20. Migration & Integrity

Schema evolution follows a versioned migration system:

- **Detection**
  - On boot, compare `snapshot.meta.version` to the latest known version.
  - When older, run sequential migration steps until up to date.

- **Execution**
  - Migration functions return a fully hydrated snapshot. Failures throw and
    leave the on-disk data untouched.
  - Successful migrations append audit event `migration.completed` and set
    `meta.migratedFrom`.

- **Corruption handling**
  - Invalid JSON or schema violations trigger an internal `storage.corruption`
    audit entry and fall back to seeded defaults (with best-effort backup of the
    corrupted payload for developer inspection).
  - Reset utilities can wipe the corrupted data entirely.

- **Testing**
  - Dedicated migration tests ensure sequential upgrades (e.g., v1 → v2 → v3)
    produce expected snapshots and audit entries.

## 21. Developer Inspector & Utilities

The developer tooling surfaces storage internals for debugging.

- **Inspector panel**
  - Read-only tree view of the snapshot, history, and audit logs.
  - Provides search/filter by document ID or event type.
  - Displays derived metrics (history counts, storage size estimate, quota
    usage).

- **Utilities**
  - "Reset storage" invokes `reset()` and reloads the page state.
  - "Simulate first run" clears storage and seeds a tutorial document without
    wiping configuration overrides.
  - "Run garbage collection" forces purge checks immediately.

- **Developer logging**
  - Debug builds log every storage mutation with before/after sizes.
  - Production builds log only unrecoverable errors.

## 22. AI Handoff & Test Tracking

This section is for the AI or developers to update after implementation runs.

- **Where this logic lives**:
  - `/apps/web/src/lib/stores/`

- **What has been implemented**:
  - Storage schema types and defaults scaffolding (`apps/web/src/lib/stores/storage/*`)
  - Local storage driver wrapper with subscription hook
  - Initial storage engine exposing read-only Svelte stores and reset/refresh utilities

- **What remains to be implemented**:
  - Document/index/settings mutation APIs covering creation, updates, soft delete/restore, and reordering as defined in §17.
  - History capture, undo/redo stacks, retention pruning, and audit hooks described in §18.
  - Broadcast scheduling, cross-tab refresh flows, and quota-aware garbage collection from §19 and §6.
  - Migration pipeline, corruption recovery, and developer inspector tooling described in §§20–21.

- **Test files and coverage**:
  - Unit tests for storage engine hydration, refresh, reset, and update semantics: `/apps/web/src/lib/stores/storage/engine.test.ts`
  - Unit tests for history capture and eviction: `/apps/web/src/lib/stores/storage-history.test.ts`
  - Unit tests for migration upgrades and corruption fallback: `/apps/web/src/lib/stores/storage-migration.test.ts`
  - Unit tests for multi-tab synchronisation and broadcast throttling: `/apps/web/src/lib/stores/storage-sync.test.ts`
  - Unit tests for garbage-collection purge ordering: `/apps/web/src/lib/stores/storage-gc.test.ts`
  - Unit tests for audit logging invariants: `/apps/web/src/lib/stores/storage-audit.test.ts`

This section is continuously updated as progress is made.
