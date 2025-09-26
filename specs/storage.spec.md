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

The storage runtime is split into a framework-agnostic **Storage Core** that orchestrates persistence/read models and a Svelte-facing engine that adapts the core into readable stores. Callers interact with the engine, while tests can exercise the core directly without touching UI concerns.

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
  - `scheduleBroadcast` coalesces messages until the next macrotask, prefers `BroadcastChannel` when available, and falls back to emitting synthetic `storage` events when the channel API fails or is unavailable.

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

Document APIs expose the following behaviours. The listed helpers are the public
surface expected from the engine module—callers should never mutate the
snapshot directly.

- **`createDocument({ title?, content?, position? })`**
  - Generates a UUID for the document ID and honours an optional insertion
    position (defaults to the end of the active, non-deleted index).
  - Seeds the document body with either the provided content or the default
    template from `defaults.ts` and stamps `createdAt`/`updatedAt` with the same
    value.
  - Inserts the new `DocumentIndexEntry`, promotes it to the active selection,
    and reorders the index accordingly.
  - Appends audit event `document.created` with metadata `{ id, title }` and a
    history snapshot capturing the pre-create active document so undo restores
    focus correctly.

- **`updateDocument(id, mutator)`**
  - Fetches the existing document and passes a shallow clone to `mutator`. The
    mutator returns `{ title?, content?, lastEditedBy? }` which is merged with
    the stored snapshot before persisting.
  - Bumps `updatedAt` whenever a field actually changes and, when applicable,
    stores the provided `lastEditedBy` identity token.
  - Enqueues a history snapshot **before** persistence so undo returns to the
    previous state. The snapshot contains `{ id, title, content, updatedAt }`.

- **`softDeleteDocument(id)`**
  - Sets `deletedAt` to now, calculates `purgeAfter = now + retention`, and
    removes the document from default selection flows. If the deleted doc was
    active, selection moves to the next non-deleted entry (or `null`).
  - Emits audit event `document.deleted` including `{ id, purgeAfter }` and adds
    a history entry for the active selection change.

- **`restoreDocument(id)`**
  - Clears `deletedAt` and `purgeAfter`, reinserts the entry at its previous
    index position (tracked via a stored `previousIndex` field), and restores
    focus if no other document is currently active.
  - Emits audit event `document.restored` and captures a history snapshot of the
    restored document so redo can reapply changes if the restore is undone.

- **`reorderDocuments(newOrderIds)`**
  - Accepts a list containing every non-purged document ID exactly once. The
    engine validates the list before applying it to `index` to protect against
    data loss from malformed drag/drop payloads.
  - Emits audit event `document.reordered` with `{ before, after }` arrays so
    developers can inspect the delta and test assertions remain easy to write.

- **`purgeExpiredDocuments(now)`**
  - Triggered by garbage collection when `purgeAfter ≤ now`. Permanently removes
    the index entry, associated document snapshot, and all history entries
    referencing the purged ID.
  - Adds audit events for both the purge (`document.purged`) and the linked
    history trimming (`history.pruned`).

Settings share similar helpers—`updateSettings(mutator)` and
`setActiveDocument(id | null)`—that follow the same atomic snapshot update
pattern. All operations are debounced via the write scheduler (default 2s) but
can be forced immediately by developer utilities (e.g., reset).

## 18. History Management

Undo/redo relies on explicit snapshot captures. The spec mandates:

- **Capture strategy**
  - Before each mutation, persist a snapshot of the target scope (doc/settings).
  - Snapshots contain the minimal JSON required to restore state; for documents
    this includes `title`, `content`, and timestamps.

- **Timelines**
  - Separate stacks per document plus a shared stack for settings. Undoing a doc
    change only affects that document's history.
  - Each timeline is implemented as `{ past: [], future: [], cursor }` and
    tracks `cursor` state so redo is possible until another write occurs. When a
    new write happens the `future` array is cleared.
  - History records also persist `origin` (`keyboard`, `toolbar`, `api`) to aid
    debugging and telemetry.

- **Retention**
  - History older than `historyRetentionDays` or beyond `historyEntryCap` is
    trimmed FIFO. Trimming records an audit entry of type `history.pruned`.

- **Undo/Redo mechanics**
  - Undo pops the previous snapshot, writes it to storage, and pushes the current
    state onto the redo stack.
  - Redo pops from the redo stack and applies it similarly.
  - Calling undo when no history exists is a no-op.

- **Data structures**
  - In-memory caches mirror the persisted history so hot paths (undo/redo) avoid
    reparsing JSON on every action. The cache is rehydrated from the snapshot on
    boot and invalidated on `refresh()`.
  - Each history entry includes a monotonically increasing `sequence` so tests
    can assert ordering even when timestamps are identical (e.g., frozen clock).

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

- **Scheduling contract**
  - Calls to `scheduleBroadcast(payload)` enqueue `payload` into a microtask
    queue that is flushed after `config.debounce.broadcastMs`. Multiple calls
    within the window coalesce into a single broadcast containing
    `{ scope: Set<string>, lastMutationAt }`.
  - The queue is observable in development builds via the inspector so pending
    broadcasts can be introspected.
  - Broadcast payloads include a `snapshotChecksum` (matching §22) to detect
    whether the receiver already applied the same state and can short-circuit
    redundant refreshes.

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

- **Implementation scaffolding**
  - Migration steps live in `/apps/web/src/lib/stores/storage/migrations` and
    export `{ from: number, to: number, migrate(snapshot) }` objects. A helper
    `runMigrations(snapshot, targetVersion)` iterates through the sorted list and
    applies each step in order.
  - Each migration must be idempotent—running the same step twice should return
    an identical snapshot—to simplify corruption recovery retries.
  - A `latestSnapshotSchema.json` artefact is emitted by tests to make diffing
    easier across releases.

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

## 22. Storage Driver & Persistence Medium

The storage driver is the lowest-level abstraction responsible for reading and
writing the full snapshot payload. For the MVP we standardise on
`localStorage`, but the driver contract should remain agnostic so future
backends (IndexedDB, File System Access API, cloud sync) can be adopted without
rewriting the engine.

- **Keying & format**
  - The canonical key is `kelpie.storage`; all writes serialise the snapshot as
    deterministic JSON with stable key ordering to simplify diffing in dev
    tools.
  - Backups (for corruption recovery) are written under
    `kelpie.storage.backup.{timestamp}` and are pruned automatically when more
    than three are present.
  - Broadcast payloads reuse the `kelpie.storage.broadcast` key when
    `BroadcastChannel` is unavailable.

- **Read semantics**
  - `read()` returns `null` when no snapshot is present and **never** throws;
    parsing errors trigger corruption handling (§20) and emit a diagnostic audit
    event.
  - Reads must be synchronous to avoid blocking the boot sequence; asynchronous
    backends must expose a synchronous hydration cache.

- **Write semantics**
  - `write(snapshot)` performs a single `setItem` call. On quota errors it
    throws a `StorageQuotaError` subtype so the engine can surface an
    unrecoverable failure.
  - Successful writes update an in-memory checksum so redundant writes (same
    snapshot) can be skipped by callers.
  - Every write stores the checksum beside the payload (keyed
    `kelpie.storage.checksum`). During boot the driver reads both values so the
    engine can detect tampering and trigger corruption recovery when they do not
    match.

- **Subscriptions**
  - `subscribe(handler)` wires `window.addEventListener("storage", …)` and
    returns an unsubscribe function.
  - Storage events from the same tab are ignored to prevent feedback loops.
  - When `BroadcastChannel` is supported the driver joins
    `kelpie.storage.broadcast` and forwards remote messages through the same
    handler signature.

- **Environment fallbacks**
  - In non-browser contexts (SSR, Vitest) the driver injects an in-memory shim
    implementing the same interface so tests can run deterministically.
  - When `localStorage` is unavailable, boot aborts with a fatal error and the
    UI surfaces a “storage unsupported” screen (post-MVP).

## 23. Quota Management & Size Tracking

Quota limits vary by browser; the engine provides best-effort safeguards to stay
within them.

- **Size estimation**
  - Every successful write computes the serialised byte length and stores it in
    `meta.approxSize`. This value powers inspector visualisations and GC
    heuristics.
  - History and audit entries track their individual byte contributions in
    memory so GC can prioritise the largest offenders.

- **Preflight checks**
  - Before writing, the engine estimates the new payload size. If the size
    exceeds `config.quotaWarningBytes` the write is allowed but an audit entry of
    type `storage.quota.warning` is appended.
  - If the size exceeds `config.quotaHardLimitBytes`, the write fails before
    touching storage and the caller receives a `StorageQuotaError`.
  - The estimator is deterministic: it reuses the canonical JSON serialiser so
    the byte size matches the eventual persisted payload within a ±10 byte
    margin. Deviations outside the margin emit a `storage.quota.drift` audit
    event for investigation.

- **Garbage collection triggers**
  - GC runs automatically when a quota warning is emitted, after undo/redo
    pruning, and whenever the user is idle for longer than
    `config.gcIdleTriggerMs` (default 30s).
  - GC follows the ordering defined in §6 and continues until the projected size
    falls below `quotaWarningBytes`.

- **Developer tooling**
  - The inspector displays the current payload size vs. quota limits, including
    a per-section breakdown (documents, history, audit).
  - Dev builds emit `console.info` messages when GC reduces size by more than
    10% to help tune retention caps.

## 24. Testing & Instrumentation Strategy

Robust automated coverage is required to ensure the storage layer remains
stable as schemas evolve.

- **Unit tests**
  - Driver tests mock `localStorage` failures, broadcast fallbacks, and
    corruption recovery.
  - Engine tests validate update atomicity, derived store synchronisation, and
    quota handling (including GC triggers).
  - History and migration suites use frozen timestamps to assert deterministic
    retention.

- **Integration tests**
  - Playwright flows cover multi-tab editing, undo/redo, and soft delete
    recovery using two concurrent browser contexts.
  - A smoke test boots the app with a seeded snapshot and ensures the inspector
    renders accurate counts.
  - Visual regression tests capture the inspector panel before and after GC
    events to guarantee telemetry hooks do not regress UI state.

- **Telemetry hooks**
  - Optional build-time flag enables instrumentation that records quota
    warnings, corruption recoveries, and migration durations to `console.table`
    for manual analysis. This remains disabled in production bundles.

## 25. Security, Privacy & Compliance

Although data remains on-device, the storage layer must respect user privacy and
handle sensitive content responsibly.

- **Data residency**
  - All data stays within the browser; no network calls are made from the
    storage layer.
  - Future sync providers must be pluggable so enterprise deployments can choose
    compliant backends.

- **Personally identifiable information**
  - Audit metadata should never store raw user input beyond document IDs and
    anonymised author identifiers. Free-form fields must be sanitised before
    persistence.

- **Encryption readiness**
  - The snapshot schema must remain compatible with future client-side
    encryption by isolating encryption-ready fields (documents, history,
    settings) from non-sensitive configuration.
  - All driver APIs accept optional `encrypt/decrypt` hooks so encryption can be
    layered without refactoring call sites.

- **Compliance toggles**
  - `config.enableAudit` allows deployments to disable audit logging entirely
    when regulations forbid it. When disabled, API calls must be no-ops but still
    succeed to keep consumers simple.

## 26. Roadmap & Future Enhancements

These initiatives extend beyond MVP but should influence current decisions.

- **Cloud backup integration**
  - Pluggable drivers for cloud providers (Supabase, S3, KV) using the same
    snapshot schema. Requires background sync, conflict resolution, and auth
    hooks.

- **Selective encryption**
  - Hybrid model encrypting documents while leaving configuration in plaintext,
    balancing security with inspectability.

- **Collaborative editing**
  - Transition from last-write-wins to CRDT-based merges. Requires timeline
    annotations in history entries and more granular change logs.

- **Schema diff tooling**
  - CLI to generate migration scaffolds and validate snapshot compatibility via
    JSON schemas. Aids regression testing and documentation updates.

- **User-facing recovery UX**
  - Expose deleted document recovery, quota warnings, and corruption restores in
    the UI with clear affordances.

## 27. AI Handoff & Test Tracking

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
  - Broadcast scheduling, cross-tab refresh flows, and quota-aware garbage collection from §§19, 6, and 23.
  - Migration pipeline, corruption recovery, and developer inspector tooling described in §§20–21.
  - Driver resilience features (backups, fallbacks, quota errors) and telemetry instrumentation from §§22–24.
  - Privacy toggles, encryption hooks, and compliance-aware audit policies from §25.

- **Test files and coverage**:
  - Unit tests for storage core hydration, refresh, reset, and update semantics: `/apps/web/src/lib/stores/storage/core.test.ts`
  - Integration tests for the Svelte engine wrapper: `/apps/web/src/lib/stores/storage/engine.test.ts`
  - Unit tests for history capture and eviction: `/apps/web/src/lib/stores/storage-history.test.ts`
  - Unit tests for migration upgrades and corruption fallback: `/apps/web/src/lib/stores/storage-migration.test.ts`
  - Unit tests for multi-tab synchronisation and broadcast throttling: `/apps/web/src/lib/stores/storage-sync.test.ts`
  - Unit tests for garbage-collection purge ordering: `/apps/web/src/lib/stores/storage-gc.test.ts`
  - Unit tests for audit logging invariants: `/apps/web/src/lib/stores/storage-audit.test.ts`

This section is continuously updated as progress is made.
