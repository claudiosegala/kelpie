# Settings Panel Spec

## Introduction

The **Settings Panel** gives Kelpie users an opinionated way to tailor the editor, preview, and shell experience without leaving the app. It is the human-facing surface for runtime configuration: themes, keyboard shortcuts, preview behavior, and data management utilities. The panel must feel lightweight yet powerful, always reflecting the actual state stored by the app shell and storage layer.

The panel lives inside the App Web Shell and talks to both the shell contracts and the storage layer. It owns form UX, validation, and optimistic updates; the shell coordinates persistence and propagates changes to interested panels.

## Outcomes

- **For users**
  - Immediate feedback when changing theme, typography, or preview cadence.
  - Safe editing of keyboard shortcuts with conflict detection.
  - Confidence that settings persist across sessions and tabs.
  - Clear paths to reset to defaults or import/export configuration.
  - Helpful empty states and hints when advanced options are not yet available.

- **For developers**
  - A single source of truth for settings schema and defaults.
  - Predictable events emitted to the shell for persistence and live updates.
  - Opinionated UI conventions (sections, toggles, reset buttons) that guide future additions.
  - Testable contracts for validation, optimistic updates, and rollbacks.

## Goals

- Present settings in grouped, opinionated sections (Appearance, Behavior, Shortcuts, Data) with consistent layout.
- Apply changes optimistically while deferring persistence to the shell/storage layer.
- Detect and surface conflicts (e.g., duplicate shortcuts) before emitting updates.
- Provide single-click reset-to-defaults per section and globally.
- Support import/export of settings blobs (JSON) via file picker and clipboard.
- Reflect remote changes (e.g., from another tab) without losing unsaved edits.

## Scope

**Included for MVP**

- Four top-level sections:
  1. **Appearance** – theme selection, base font size, line height, contrast mode toggle.
  2. **Behavior** – preview debounce slider, autosave interval display (read-only), enable experimental preview interactions.
  3. **Shortcuts** – editable list of keybindings for undo/redo, toggle preview, open settings, quick switcher.
  4. **Data & Advanced** – export settings, import settings, reset all, clear local storage (developer mode only).
- Inline validation and optimistic state for each control.
- Live preview of theme changes in the panel itself and broadcast to shell.
- Keyboard navigation with focus outlines for accessibility.
- Support for both desktop (side panel) and mobile (full-screen sheet) layouts.

**Excluded for MVP**

- Settings search/filter.
- Granular permissions per team member (single-user only).
- Server sync or cloud backups.
- Version history of settings or undo exposure to end users.
- Deep customization of preview rendering beyond cadence toggle.

## Data Entities

The Settings Panel works with the following data structures:

- **SettingsSnapshot** – full schema object fetched from storage, containing subsections for appearance, behavior, shortcuts, and advanced flags.
- **SectionDraft** – temporary client-side copy of a section while the user edits; supports dirty state tracking and rollback.
- **ShortcutBinding** – normalized record `{ id, action, keys[], scope }` with metadata for conflict detection.
- **ThemeOption** – entry describing available DaisyUI themes (id, label, preview swatch data).
- **ImportPayload** – JSON blob parsed from import/export flow, validated against schema version.
- **ValidationError** – collection of field-level errors keyed by setting path.

## Behavior

- **Initialization**
  - Panel receives the current `SettingsSnapshot` from the shell on mount.
  - Sections render with defaults if snapshot is unavailable (first run).
  - Developer-mode actions are hidden unless shell marks environment as `dev`.

- **Optimistic Editing**
  - Editing a control updates the relevant `SectionDraft` immediately.
  - Drafts emit `settings:sectionDraftChanged` events with diff payloads.
  - Panel debounces outgoing updates (default 200ms) before notifying the shell.

- **Persistence Cycle**
  - Shell acknowledges updates via `settings:updateStatus` events (`pending`, `saved`, `error`).
  - Panel displays inline status (e.g., spinner, checkmark, retry) next to section headers.
  - On error, panel reverts the draft to last known good state and surfaces a toast via shell.

- **Conflict Detection**
  - Shortcuts are validated locally; duplicates show inline errors and disable the save button for that section.
  - Import payloads are validated against schema version; mismatches prompt user to confirm migration or cancel.

- **Reset & Defaults**
  - Each section header includes a `Reset to defaults` action with confirmation modal.
  - Global reset is available under Data & Advanced; triggers full snapshot reset event.
  - Resets emit `settings:resetRequested` with scope (`section` or `global`).

- **Import/Export**
  - Export triggers shell to provide current snapshot JSON, offered as download and copy-to-clipboard.
  - Import opens file picker or paste modal; panel parses JSON, validates, and shows diff summary before applying.
  - Successful import replaces relevant sections and emits update event; errors show inline messaging.

- **Live Theme Preview**
  - Selecting a theme updates panel preview immediately (background, text, accent swatches).
  - Panel emits `settings:themeChanged` event so shell can re-theme other panels in real time.

- **Cross-tab Updates**
  - If shell notifies of external changes (`settings:snapshotUpdated`), panel merges them unless the user has unsaved edits in that section. In that case, a non-blocking banner prompts to refresh or keep local draft.

## API Structure (Contracts)

The panel communicates with the shell using structured events. Naming is descriptive; implementation may vary.

- **Inputs from Shell**
  - `settings:init(snapshot, meta)` – initial payload with settings and environment flags.
  - `settings:updateStatus(sectionId, status, error?)` – status updates for in-flight persistence.
  - `settings:snapshotUpdated(snapshot, source)` – remote updates from other tabs or migrations.

- **Outputs to Shell**
  - `settings:sectionDraftChanged(sectionId, diff)` – optimistic updates emitted as user edits.
  - `settings:commit(sectionId, draft)` – request to persist a section.
  - `settings:resetRequested(scope)` – user requested reset for a section or entire snapshot.
  - `settings:importRequested(payload)` – parsed import data ready for persistence.
  - `settings:exportRequested()` – user triggered export; shell responds with blob or link.
  - `settings:toast(message, variant)` – optional helper to request toast feedback.

## UI & Interaction Details

- **Layout**
  - Desktop: anchored right-hand panel with scrollable sections, sticky header showing `Settings` title and close button.
  - Mobile: full-screen modal sheet with top app bar, sections collapsible for easier navigation.
  - Section cards use DaisyUI components with consistent padding, heading, description, and control stack.

- **Controls**
  - Appearance: theme dropdown with preview chips, font size slider (12–20pt), line height select (1.2–1.8), contrast toggle.
  - Behavior: preview debounce slider (100–2000ms), autosave interval display (read-only text from shell), experimental toggle.
  - Shortcuts: table with action labels, editable key combination input, conflict badge, `Restore default` per row.
  - Data & Advanced: buttons for export (download + copy), import (file + paste), reset all, clear storage (dev only) with confirmation dialogs.

- **Accessibility**
  - All controls keyboard navigable and screen-reader labeled.
  - Live region for persistence status updates.
  - Color contrast meets WCAG AA even when switching themes.

- **Empty/Error States**
  - If settings fail to load, show informative message with retry button while shell fetches snapshot.
  - Import validation errors show structured list of issues and do not mutate current settings.

## Developer Experience & Testing

- Storybook stories (or equivalent) for each section to validate controls in isolation.
- Vitest unit tests covering:
  - Draft state reducers.
  - Shortcut conflict detection.
  - Import parsing and validation flows.
- Playwright tests ensuring:
  - Theme changes propagate to preview (visual regression optional).
  - Reset-to-defaults clears overrides.
  - Mobile layout renders sections collapsible and accessible.
- Telemetry hooks (optional) emit events when resets, imports, or experimental toggles are used, aiding future analytics.

## Example Scenarios

1. **Change theme and font size**
   - User opens settings, selects `Solarized` theme → panel preview updates → shell re-themes editor and preview → status shows `Saved ✓`.
   - User adjusts font size slider → inline preview updates → shell persists after debounce.

2. **Shortcut conflict**
   - User sets `Toggle Preview` to `Cmd+P` which conflicts with `Command Palette` → panel highlights both entries, shows warning, and disables save until resolved.

3. **Import settings from file**
   - User selects JSON file → panel validates schema → shows summary `3 appearance changes, 1 shortcut change` → user confirms → shell persists and broadcasts update → other tabs refresh settings.

4. **Cross-tab change**
   - Settings updated in another tab → shell emits `snapshotUpdated` → panel shows banner `Settings updated elsewhere` → user clicks `Apply` → local drafts merge with remote snapshot.

5. **Reset Data (Developer)**
   - Developer opens Data & Advanced → clicks `Clear local storage` → confirmation modal warns about data loss → upon confirm, panel emits reset request → shell clears storage and reloads app.

## Open Questions & Assumptions

- Should theme previews extend to editor/preview thumbnails, or is panel theming sufficient?
- How should conflicts between unsaved local drafts and remote updates be resolved automatically (merge strategy)?
- Are there settings that require confirmation modals before applying (e.g., experimental toggles)?

**Assumptions:**

- Shell handles final persistence, error toasts, and environment flags (dev mode) and will acknowledge panel events.
- Storage schema versioning ensures import/export compatibility; panel only validates and displays mismatches.
- Undo for settings remains internal; panel does not expose keyboard shortcuts for it in MVP.

## 15. AI Handoff & Test Tracking

- **What has been implemented**: _Initial spec only._
- **What remains to be implemented**: All UI components, stores, event contracts, tests.
- **Test files and coverage**: _To be defined once implementation starts._
