# Storage architecture

Kelpie's web app persists editor data through a small storage engine that wraps
Svelte stores around a serialised snapshot. The goals are:

- keep the UI reactive by exposing read-only stores,
- isolate persistence details behind a driver abstraction, and
- centralise schema/metadata logic for future features such as history,
  multi-document support, and cross-tab synchronisation.

## Modules and responsibilities

| Module                           | Responsibility                                                                                                                                                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`constants.ts`](./constants.ts) | Defines schema version numbers and default caps used across the storage layer.                                                                                                                                                                                              |
| [`types.ts`](./types.ts)         | Declares the snapshot schema (installation meta, configuration, settings, document index, history, audit trails).                                                                                                                                                           |
| [`defaults.ts`](./defaults.ts)   | Builds default runtime configuration, UI settings, and the initial snapshot that seeds a new installation.                                                                                                                                                                  |
| [`driver.ts`](./driver.ts)       | Wraps the host persistence API. The default driver uses `localStorage` but any alternative (memory, IndexedDB, remote APIs) can be swapped in. The driver also exposes a `subscribe` hook so the engine can react to external writes (e.g. storage events from other tabs). |
| [`engine.ts`](./engine.ts)       | Turns snapshots into writable Svelte stores (`snapshot`, `config`, `settings`) and exposes lifecycle helpers (`refresh`, `reset`, `update`). The engine coordinates with the driver, applying mutations and keeping derived stores in sync.                                 |
| [`index.ts`](./index.ts)         | Convenience barrel export for the storage subsystem.                                                                                                                                                                                                                        |

## Data flow at runtime

1. `state.ts` creates a storage engine instance at module load. On startup it calls
   `storage.update(ensurePrimaryDocument)` to guarantee that a primary document
   exists and that UI settings point at it.
2. Components read `appState` (a derived store) for the active document content
   and UI flags, and `tasks` (a derived store that parses the Markdown file).
3. Mutations go through helper functions:
   - `setDocumentContent` writes the editor value.
   - `toggleTask` re-renders a Markdown line when the preview toggles a task.
     Both helpers delegate to `updateActiveDocument`, which calls
     `storage.update(...)` with a new snapshot. The storage engine persists the
     snapshot via the driver and updates the derived stores.
4. `persistence.ts` is notified of each mutation (`markSaving` before the write
   and `markSaved` afterwards) so the toolbar can surface save status to the user.

## Why this split?

- **Testability:** the driver abstraction makes it trivial to plug in a
  deterministic in-memory driver for unit tests.
- **Future features:** configuration, audit, and history data live alongside the
  document content. Upcoming tasks can extend the schema without touching the UI
  surface area.
- **Cross-tab support:** `driver.subscribe` gives the engine a single place to
  react to external writes (BroadcastChannel, `storage` events, etc.) without the
  UI knowing about transport details.

With this wiring the UI stays simple—components only consume Svelte stores—while
all persistence behaviour is owned by the storage engine and its driver.
