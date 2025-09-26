# Recently implemented improvements

## 1. Task toggling keeps the correct source line

`parseTaskLine` now records the original line index for every parsed task, and `toggleTask` uses that metadata when writing back to the Markdown buffer. This ensures toggling a checkbox updates the correct line even when headings or blank lines appear above the task.【F:apps/web/src/lib/parsing/parseTask.ts†L1-L88】【F:apps/web/src/lib/stores/state.ts†L200-L229】 Tests also verify the line index survives documents with intermixed non-task content.【F:apps/web/src/lib/parsing/parseTask.test.ts†L1-L97】

## 2. Regex-based tag parsing resets cursor state

Each invocation of `parseTaskLine` now resets the global regex cursors before and after matching, preventing stale `lastIndex` values from skipping tags on subsequent parses.【F:apps/web/src/lib/parsing/parseTask.ts†L9-L88】 A dedicated test confirms that repeated parses keep extracting the same tag values.【F:apps/web/src/lib/parsing/parseTask.test.ts†L14-L43】

## 3. Storage updates broadcast across tabs

The storage engine now calls `scheduleBroadcast` after resets and any persisted updates, emitting a snapshot-scoped message with the `'local'` origin. This keeps other tabs in sync without manual refreshes.【F:apps/web/src/lib/stores/storage/engine.ts†L1-L191】 Tests assert broadcasts fire only when writes occur and remain silent for no-op updates.【F:apps/web/src/lib/stores/storage/engine.test.ts†L1-L252】
