# App Web Shell Spec

## Introduction

The **Kelpie App Shell** is the container of the application. It provides the frame in which all panels live, coordinates their communication, and ensures offline-first behavior. It includes the toolbar, manages save state, applies themes, and handles errors. It is the “shell” that houses the **Code Editor Panel**, the **Interactive Preview Panel**, and the **App Settings Panel**.

## Outcomes

- **For users**:
  - A single-page app that works offline, shows a clear “Saving locally” indicator, and lets them edit tasks in an editor, see them rendered in a preview, and configure settings.
  - Mobile users can switch between panels using toolbar controls.
  - Errors are surfaced with clear toasts instead of silent failures.

- **For developers**:
  - Clear division of responsibility: Shell vs. Panels.
  - Contracts for what panels emit and receive.
  - Stable offline save behavior with visible status.
  - Theming via TailwindCSS + DaisyUI with room for dynamic customization.
  - A structure that supports testing with Vitest + Playwright.

## Goals

- Guarantee that the app shell coordinates editor, preview, and settings without leaking responsibilities.
- Ensure save state is always explicit (“Saving locally” / “Saved ✓”).
- Provide a consistent offline experience (PWA).
- Provide error bubbling that surfaces failures clearly but non-destructively.
- Allow live theme customization without disrupting editing.

## Scope

**Included for MVP:**

- Single-page layout with three modes (Editor+Preview, Preview-only, Settings).
- Toolbar with branding, version, undo/redo, save indicator, and mobile switching.
- Contracts between Shell and Panels for content, editing state, interactions, and settings.
- Offline save and toast-based error handling.
- Theming through Tailwind + DaisyUI.
- Animations for smooth panel transitions.

**Excluded for MVP:**

- Real-time collaboration.
- Cloud storage or sync.
- Complex theme management (beyond DaisyUI + live color changes).
- Settings search/filter.
- Undo/redo for settings.

## Data Entities

- **Editor Content**: the text input, tied to a tab identifier.
- **Save State**: a status flag (`Saving locally`, `Saved ✓`, or `Error`).
- **Theme**: a JSON configuration mapped to DaisyUI and Tailwind variables.
- **Shortcut Mappings**: current keybindings for undo/redo and other commands.
- **Interaction Events**: user actions from the preview (e.g., marking a task done).
- **Errors**: bubbled exceptions from panels.

## Behavior

- **Saving**:
  - Always local.
  - Status is always visible.
  - If saving fails, toast notification appears and data can be exported manually.

- **Undo/Redo**:
  - Limited to editor and preview actions.
  - Disabled when unavailable.
  - Shortcuts defined in Settings, listened to by Shell.

- **Preview updates**:
  - Shell receives editor content.
  - Debounced using interval defined in Settings.
  - Preview re-renders on debounced content.

- **Panel switching**:
  - Desktop: side-by-side.
  - Mobile: only one visible at a time, switching via toolbar.

- **Error handling**:
  - All exceptions bubble up to Shell.
  - Shell shows non-blocking toast notifications.

## API Structure (as Responsibilities)

- **Code Editor Panel**:
  - Must notify Shell when content changes.
  - Must signal when editing begins (unsaved) and when content is saved.
  - Must accept undo/redo triggers and debounce interval.

- **Preview Panel**:
  - Must render content sent from Shell.
  - Must notify Shell of user interactions (e.g., marking tasks done).
  - Must notify Shell when rendering fails.

- **Settings Panel**:
  - Must provide current shortcuts, theme, debounce interval, import/export options.
  - Must apply updates live.
  - Must allow reset to defaults.

- **App Shell**:
  - Must orchestrate contracts above.
  - Must display save status, branding, version.
  - Must propagate theme changes.
  - Must handle errors consistently.

## Developer Experience

- **Tooling**:
  - Vite bundler, strict TypeScript.
  - Vitest for unit tests.
  - Playwright for e2e tests.
  - TailwindCSS + DaisyUI for rapid UI building.

- **Debugging aids**:
  - Toast system for error visibility.
  - Dev mode logs for bubbled exceptions.
  - Ability to export unsaved data.

- **Monorepo structure**: each major panel lives in its own package; app shell orchestrates.

## Example Scenarios

1. **Editing and saving**
   - User types in editor → Shell shows “Saving locally…” → After debounce, content is persisted → Shell updates to “Saved ✓”.

2. **Undo unavailable**
   - No prior action → Undo button disabled in toolbar.

3. **Error in preview**
   - Editor sends malformed content → Preview reports error → Shell shows toast with “Preview error: …”.

4. **Mobile switching**
   - User on mobile → Only editor visible → Taps toolbar switch → Preview replaces editor with animation.

5. **Theme update**
   - User changes color in settings → Shell applies DaisyUI theme live → Editor + Preview update instantly.

## Open Questions & Assumptions

- Should save indicator also include **last saved timestamp**?
- Should preview interactions update the underlying editor content, or remain visual only?
- Should Shell automatically retry failed saves, or only notify users?

Assumption: For MVP, **retry is not implemented**; interactions in preview do not feed back into editor text.

## 15. AI Handoff & Test Tracking

This section is for the AI or developers to update after implementation runs.

- **What has been implemented**:
  - App shell scaffolding with toolbar, save indicator, and panel slots wired into Svelte stores.
  - Responsive shell state store with layout detection hooks and persistence status tracking.
  - Route updated to consume new shell and panel components with placeholder settings panel.

- **What remains to be implemented**:
  - Hooking undo/redo triggers, debounce configuration, and theme application into the shell contracts.
  - Toast-based error handling, offline indicator polish, and panel-specific behaviors (settings form wiring, preview interactions).
  - Browser-mode unit tests covering shell interactions once Playwright/browser runners are available in CI.

- **Test files and coverage:**:
  - Unit store coverage: `/apps/web/src/lib/stores/shell.test.ts`

## 16. Save Indicator UX

- The save indicator sits inside the toolbar and is always visible on desktop and mobile.
- Idle state (`kind = idle`) shows “Saved locally ✓” without a timestamp but still exposes the tooltip that explains offline storage.
- Saving state pulses with the info tone, displays “Saving locally…” and keeps the tooltip focused on local-first behavior.
- Saved state switches to the success tone, adds the last saved time in parentheses, and remains focusable for screen-reader re-announcement.
- Error state swaps to the error tone, keeps the tooltip guidance for retry/export, and surfaces the bubbled error message from persistence.
- All states expose `aria-label = "<status label>. <tooltip message>"` so assistive tech hears both the current status and next-step guidance.

```gherkin
Feature: Save indicator communicates persistence state
  Scenario: Saving state pulses with info tone
    Given the app shell begins an offline save
    When the save status is updated to "saving"
    Then the indicator shows "Saving locally…" with a pulsing badge
    And it reports the info tone styling

  Scenario: Saved state reports the last save time
    Given the save status is updated to "saved" with timestamp "2024-06-01T12:00:00Z"
    Then the indicator shows "Saved locally ✓"
    And it displays the formatted time in parentheses after the label

  Scenario: Error state surfaces retry guidance
    Given the save status is updated to "error" with message "Disk full"
    Then the indicator shows "Disk full"
    And the tooltip explains how to retry or export the data
```

## 17. Persistence Store API

- `saveStatus` is a readable Svelte store exposing the current `SaveStatus` contract.
- `markSaving`, `markSaved`, and `markError` transition the store while stamping the current timestamp.
- `markError` prefers surfaced `Error.message`, falls back to string values, and otherwise emits a friendly default.
- `resetSaveStatus` restores the idle contract so unit tests and preview stories start from a known baseline.
- Tests cover both the store transitions and the Save Indicator component rendering against the spec.

### Updated Test Tracking

- **What has been implemented**:
  - App shell scaffolding with toolbar, save indicator, and panel slots wired into Svelte stores.
  - Responsive shell state store with layout detection hooks and persistence status tracking.
  - Route updated to consume new shell and panel components with placeholder settings panel.
  - Persistence store reset helper to support deterministic Save Indicator tests.
  - Save Indicator component verified against idle, saving, saved, and error states in unit tests.

- **What remains to be implemented**:
  - Hooking undo/redo triggers, debounce configuration, and theme application into the shell contracts.
  - Toast-based error handling, offline indicator polish, and panel-specific behaviors (settings form wiring, preview interactions).
  - Browser-mode unit tests covering shell interactions once Playwright/browser runners are available in CI.

- **Test files and coverage:**:
  - Unit store coverage: `/apps/web/src/lib/stores/shell.test.ts`
  - Persistence store coverage: `/apps/web/src/lib/stores/persistence.test.ts`
  - Save indicator coverage: `/apps/web/src/lib/app-shell/SaveIndicator.test.ts`
  - E2E for toolbar state & undo/redo buttons: `/apps/web/e2e/shell-toolbar.test.ts`
  - E2E for save indicator (saving/saved/error): `/apps/web/e2e/shell-save-indicator.test.ts`
  - E2E for debounce & propagation to preview: `/apps/web/e2e/shell-debounce.test.ts`
  - E2E for error bubbling & toast notifications: `/apps/web/e2e/shell-errors.test.ts`
  - E2E for panel switching (desktop & mobile): `/apps/web/e2e/shell-panel-switching.test.ts`
  - E2E for theme updates (live DaisyUI changes): `/apps/web/e2e/shell-theme.test.ts`
  - E2E for PWA offline mode validation: `/apps/web/e2e/shell-offline.test.ts`

This section is continuously updated as progress is made.
