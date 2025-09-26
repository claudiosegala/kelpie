# Code Editor Panel Spec

## 1. Introduction

The **Code Editor Panel** is the authoring surface of the Kelpie app. It requests Markdown directly from the document storage service, renders it with opinionated defaults (tasks, tags, metadata), and publishes structured change events back to the shell and storage layer. The panel must feel native to task writers: fast, keyboard-first, with strong affordances for task metadata and undo/redo.

The panel is built with Svelte + TypeScript, relies on TailwindCSS + DaisyUI for styling, and embeds a Monaco-based editing surface. It operates offline, respects shell-provided settings, and coordinates closely with Storage for persistence. The editor chrome must feel familiar to developers, mirroring the ergonomics of popular IDEs (fluid cursoring, multi-cursor commands, seamless line movement).

## 2. Outcomes

### For users

- A responsive, keyboard-optimized editor that opens instantly with the current document.
- Opinionated Markdown assistance for tasks (checkbox toggles, `@done`, `@due`, `#tags`).
- Syntax status surfaced persistently in the footer when preview/storage report issues.
- Clear save state indicators via the shell (never ambiguous autosave).
- Undo/redo that aligns with shell shortcuts and tracks per-document history.
- Familiar developer ergonomics (multi-cursor selection, Command/Ctrl+D duplication, Alt/Option+Arrow line movement).

### For developers

- Explicit contract for inputs (document, settings) and outputs (change events, metrics).
- Encapsulated logic for Markdown enrichment so preview stays presentation-only.
- Testable behaviors covering keyboard commands, formatting helpers, and event emission.

## 3. Goals

- Provide an opinionated Markdown experience optimized for task documents.
- Guarantee deterministic change events for storage and preview synchronization.
- Respect shell-provided configuration: debounce interval, theme, accessibility preferences.
- Surface actionable errors (linting, persistence) without blocking editing.
- Maintain responsive performance (<16ms frame budget for typing) through virtualization and batching.

## 4. Scope

### In scope (MVP)

- Monaco editor integration with TypeScript-backed models.
- Toolbar hooks for undo, redo, formatting helpers, and footer controls (syntax, history).
- Task helpers: toggle checkboxes, stamp timestamps, insert templates.
- Shell contracts for change events, focus state, dirty tracking, and save acknowledgement.
- Footer diagnostics for parsing errors raised by preview or storage.
- Accessibility: ARIA labeling, screen-reader friendly notifications, keyboard navigation.
- Persistent footer bar with Undo, Redo, Syntax, and History buttons.

### Out of scope (MVP)

- Collaborative editing or remote cursors.
- Plugin marketplace or third-party extensions.
- Markdown preview inside the editor (handled by Preview Panel).
- Full linting ruleset (limited to syntax errors that break preview/storage contracts).
- Cross-document search/replace (future global command).
- Any in-editor search or replace interface (handled entirely by shell-level utilities).

## 5. Data & Contracts

- **Inputs from Shell**
  - `documentDescriptor`: `{ id, title, updatedAt, metadata }` (content fetched via storage contract).
  - `settings`: `{ theme, fontSize, lineHeight, keymap, debounceMs }`.
  - `saveStatus`: read-only indicator for toast/tooltip messaging.
  - `keyboardShortcuts`: resolved commands for undo/redo and metadata helpers.

- **Outputs to Shell**
  - `onContentChanged(change: EditorChange)`: emitted after debounce, includes `content`, `selection`, `timestamp`, `isDirty`.
  - `onImmediateChange(change: EditorChange)`: fired synchronously for undo/redo to keep history in sync.
  - `onMetadataEvent(event)`: structured events (toggle checkbox, insert due date) for analytics and preview cues.
  - `onError(error: EditorError)`: bubbled parsing or persistence errors for toast display.
  - `onFocusChanged(isFocused: boolean)`: informs shell for mobile panel switching and shortcut routing.

- **Internal Stores**
  - `editorModel`: Monaco text model bound to current document.
  - `dirtyState`: tracked per document, resets when shell confirms save.
  - `diagnostics`: derived from parser + storage validation.
  - `footerState`: tracks undo/redo enablement, syntax badge status, and history availability.
  - `documentContentCache`: latest fetched content keyed by `documentDescriptor.id` for instant swaps.

## 6. Behavior

### Document Loading

- When `documentDescriptor.id` changes, the panel requests fresh content from storage, swaps the Monaco model without losing unsaved content, and persists any pending dirty state before switching.
- Shell provides debounced save acknowledgement; panel clears dirty indicator once `onSaved(documentId)` is received.

### Typing & Change Events

- Typing updates the Monaco model immediately.
- `onContentChanged` fires after `debounceMs` (default 200ms) with the current content.
- Undo/redo trigger `onImmediateChange` to keep shell history aligned even if debounce has not elapsed.
- Dirty badge appears within the editor chrome (mirrors shell indicator) and is cleared by shell acknowledgement. No explicit save button is rendered; persistence feedback stays in the shell surface.

### Task Helpers

- Checkbox toggles are available via context actions and keyboard shortcut parity with Monaco defaults.
- Task metadata helpers (e.g., inserting `@due(YYYY-MM-DD)`) live behind quick actions surfaced near the footer buttons.
- Templates (e.g., new task, recurring task) exposed through contextual menus (no dedicated command palette inside the editor).
- Global search or replace interactions are delegated to the shell; the panel exposes focus hooks but renders no search UI.

### Diagnostics & Errors

- Footer diagnostics indicator highlights when preview parser reports an error, surfacing the latest message in the footer panel. Hover reveals message and remediation.
- Persistence errors received from shell surface as toast triggers but do not block typing.
- Editor exposes quick-fix actions when available (e.g., close unmatched parentheses).

### Footer Controls

- Persistent bar anchored below the editor surface with buttons: **Undo**, **Redo**, **Syntax**, **History**.
- Buttons mirror shell-level shortcuts and remain clickable even when the text area is unfocused to support pointer workflows.
- Syntax button opens a slide-up pane summarizing current diagnostics and remediation guidance without obscuring the text body.
- History button reveals per-document edit history supplied by storage (read-only timeline with restore hooks routed through shell APIs).
- When diagnostics exist, the footer displays the highest priority message inline without obstructing the text area and emits assistive announcements.

### Theme & Accessibility

- Theme updates propagate from shell via CSS variables; editor rebuilds Monaco theme dynamically without reloading content.
- Font size, line height, and keymap (default vs. Vim-like) adapt instantly to settings changes.
- Screen-reader announcements use `aria-live="polite"` regions to announce saves, errors, and toggles.

### Mobile Responsiveness

- On mobile, editor enters focus-lock mode: shell hides other panels while editing.
- Footer bar condenses into icon-only mode with essential actions (undo, redo, syntax, history) while preserving touch-friendly hit targets and haptic feedback hooks.

## 7. API Surface (Developer Facing)

- `createCodeEditorPanel(node, initialState, hooks)` returns a controller with:
  - `setDocumentDescriptor(descriptor)`
  - `setSettings(settings)`
  - `applySaveAcknowledgement(documentId)`
  - `focus()`, `blur()`
  - `dispose()`
- Hooks include `onChange`, `onImmediateChange`, `onMetadataEvent`, `onError`, `onFocusChange`.
- Controller manages Monaco instance lifecycle, ensuring disposal on unmount to prevent leaks.

## 8. Developer Experience & Testing

- Unit tests cover:
  - Change event emission and debounce behavior.
  - Metadata helpers (toggle, due date, templates).
  - Dirty state transitions on save acknowledgement.
  - Theme application and keymap switching.
  - Footer control state (undo/redo enablement, syntax indicator states).
- Integration tests (Playwright):
  - Typing updates preview after debounce.
  - Undo/redo via footer buttons and keyboard shortcuts.
  - Mobile focus lock toggles shell panels.
  - Diagnostics appear in footer syntax pane when preview reports errors and clear after fix.
  - History pane shows recent edits and supports revert via storage hook.

## 9. Example Scenarios

1. **Toggle a task**
   - User right-clicks `- [ ] Buy milk` and chooses **Toggle checkbox** quick action.
   - Editor updates the line to `- [x] Buy milk @done(2024-06-01)` and emits `{ type: "toggle", line: 12, checked: true }`.
   - Shell updates preview and save indicator reflects dirty state until persisted.

2. **Developer keyboard flow**
   - User selects multiple occurrences of `@due` using repeated multi-cursor duplication and moves lines with Alt/Option + Arrow keys.
   - Editor maintains smooth rendering, preserving selections and emitting a single consolidated change payload after debounce.
   - Footer history button enables quick inspection of the previous state before committing changes.

3. **Diagnostics from preview**
   - Preview parsing fails due to malformed metadata.
   - Shell sends error payload; footer Syntax button glows and displays "Unclosed @due()" in the footer pane.
   - User fixes syntax, footer message clears, preview rerenders.

4. **Mobile editing**
   - On mobile layout, user taps editor; shell switches to editor-only mode.
   - Footer condenses into icon-only controls; user taps Undo/Redo as needed while typing.
   - On blur, shell restores previous panel state.

## 10. Open Questions & Assumptions

- Should due date helper respect user-defined default timezones or rely on browser locale?
- How should conflicting settings (e.g., Vim keymap + custom shortcuts) be resolved?
- Are inline comments or collaborative cursors required in future iterations?

**Assumptions**

- Storage confirms saves via shell within 1s of debounce flush.
- Monaco provides sufficient accessibility when wrapped with ARIA landmarks.
- Preview contract for diagnostics includes range data (line/column).

## 11. AI Handoff & Test Tracking

- **Where this logic lives**:
  - `/apps/web/src/lib/panels/code-editor/`

- **What has been implemented**:
  - Monaco editor wrapper with Svelte bindings.
  - Dirty state store integrated with persistence acknowledgements.
  - Contextual quick action system for task helpers (toggle, due date, templates).

- **What remains to be implemented**:
  - Metadata event analytics pipeline.
  - Mobile focus-lock polish and footer icon compaction.
  - Diagnostic ingestion from preview channel.

- **Test files and coverage**:
  - Unit: `/apps/web/src/lib/panels/code-editor/code-editor-panel.test.ts`
  - Integration: `/apps/web/e2e/code-editor-panel.typing.test.ts`
  - Integration: `/apps/web/e2e/code-editor-panel-mobile.test.ts`
  - Integration: `/apps/web/e2e/code-editor-panel-diagnostics.test.ts`

This spec should be treated as living documentation and updated as implementation progresses.
