# Testing Coverage Gaps

This document lists notable areas of the Kelpie codebase that currently lack automated test coverage or rely on minimal assertions. Strengthening tests in these areas will help catch regressions as the spec evolves.

## App shell layout and responsiveness

- `AppShell.svelte` derives `showEditor`, `showPreview`, and `showSettings` flags from the shell store and wires a `startLayoutWatcher` cleanup path, but there are no component tests ensuring the correct panel visibility across desktop vs. mobile layouts or that the layout watcher unsubscribes on destroy.【F:apps/web/src/lib/app-shell/AppShell.svelte†L1-L79】
- The shell store exposes `startLayoutWatcher`, which binds a `matchMedia` listener. The existing store tests cover layout and panel setters but never exercise this watcher hook or its cleanup behaviour.【F:apps/web/src/lib/stores/shell.ts†L1-L57】【F:apps/web/src/lib/stores/shell.test.ts†L1-L33】

## Toolbar interactions

- `Toolbar.svelte` contains event handlers for switching view modes, activating panels on mobile, and toggling the theme, along with helper functions that compute button classes and accessibility labels. None of these pathways are verified in unit tests, so regressions to mode switching or theming logic would go unnoticed.【F:apps/web/src/lib/app-shell/Toolbar.svelte†L1-L205】

## Panel components

- `CodeEditorPanel.svelte` dispatches `contentChange` and `editingState` events when the textarea updates or focus changes, but there are no tests confirming that drafts sync when external `value` props change or that events fire with the expected payloads.【F:apps/web/src/lib/panels/editor/CodeEditorPanel.svelte†L1-L51】
- `InteractivePreviewPanel.svelte` formats tags, derives due labels, and emits `toggleTask` events per task. Tests are absent for these helpers and for ensuring the DOM reflects completed states, hashtags, and other metadata from parsed tasks.【F:apps/web/src/lib/panels/preview/InteractivePreviewPanel.svelte†L1-L97】
- `AppSettingsPanel.svelte` currently renders disabled controls seeded from props. Even basic snapshot or interaction tests are missing, so any future wiring risks regressions once the panel becomes interactive.【F:apps/web/src/lib/panels/settings/AppSettingsPanel.svelte†L1-L44】

## Storage primitives

- The default snapshot builders—`createDefaultConfiguration`, `createDefaultSettings`, and `createInitialSnapshot`—generate timestamps, schema versions, and installation IDs, yet there are no targeted tests asserting these contracts or guarding against regressions in seeded values.【F:apps/web/src/lib/stores/storage/defaults.ts†L1-L55】

## Spec extraction tooling

- The spec DSL extractor script reads Markdown specs and writes `.feature` files, but it currently runs without any automated verification. Adding tests (or converting it into a library function) would protect against regressions in regex parsing or output paths.【F:apps/web/src/lib/specdsl/extract.js†L1-L45】

## End-to-end scenarios

- Existing Playwright suites only cover task persistence and storage broadcast fallbacks. Critical flows—such as switching layout modes, toggling tasks from the preview, or validating toolbar controls—remain untested end-to-end.【F:apps/web/e2e/demo.test.ts†L1-L25】【F:apps/web/e2e/broadcast.test.ts†L1-L69】

Addressing these gaps with focused unit tests, component tests (via `@testing-library/svelte`), and additional Playwright journeys will improve confidence as new features land.
