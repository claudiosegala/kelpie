# Task Preview Panel Spec

## Introduction

The **Task Preview Panel** renders Markdown task documents into an interactive list view. It sits inside the App Web Shell and
receives content and configuration from the Code Editor Panel and Settings Panel. The preview is the primary way users triage,
complete, and review tasks without editing raw Markdown. It must mirror the source of truth stored by the editor and storage
layer while providing fast, optimistic feedback.

## Outcomes

- **For users**:
  - See an accurate, accessible representation of their Markdown tasks with sections, metadata, and tags.
  - Toggle completion states and other supported interactions and have them persist through the shell/storage contract.
  - Receive immediate feedback when interactions are processing, succeed, or fail.
  - Navigate long documents via affordances like grouping, filtering, and collapsed sections that respect Settings defaults.

- **For developers**:
  - Have a clear contract for the data the preview consumes and emits (content, derived structure, interaction events).
  - Be able to test parsing/rendering in isolation with deterministic fixtures.
  - Extend UI affordances (filters, grouping, badges) without coupling to storage or editor internals.
  - Observe and debug preview-rendering errors through the shell toast/error pipeline.

## Goals

- Reflect Markdown task state faithfully, including completion markers, metadata (due dates, tags), and ordering.
- Keep rendering reactive to editor changes with minimal perceived latency (< 150ms after debounced content).
- Provide optimistic UI for toggles while falling back to authoritative state from storage.
- Expose interaction hooks that the shell can route back to editor/storage.
- Maintain accessibility (keyboard navigation, ARIA roles, focus management).

## Scope

**Included for MVP:**

- Rendering Markdown tasks into interactive task items.
- Support for task toggling (`@done(...)` markers) and updating the editor via shell contract.
- Visual grouping by headings and ability to collapse sections (state managed within preview, persisted via settings contract).
- Badges for tags, due dates, and metadata defined in Settings defaults.
- Loading/empty/error states consistent with shell theming.
- Responsive layout that works side-by-side on desktop and as a single view on mobile.

**Excluded for MVP:**

- Arbitrary Markdown rendering beyond task-focused syntax (tables, embeds).
- Editing metadata directly in preview (e.g., inline renaming text).
- Drag-and-drop reordering (future work).
- Bulk actions (multi-select, mass toggle).
- Offline-specific UX beyond shell-provided indicators.

## Data Entities

- **Preview Input Payload**
  - Markdown string from the editor (authoritative content).
  - Debounce interval supplied via settings.
  - Active filters or grouping preferences (e.g., hide completed, group by heading).

- **Derived Task Tree**
  - Array of task nodes with ID, text, completion status, metadata, parent heading, indentation level.
  - Computed slug/anchor for linking and focus management.
  - Normalized temporal metadata (due date, scheduled start/end) for timeline ordering.

- **Interaction Event**
  - Structure emitted back to shell on user action (toggle, collapse, filter change).
  - Includes optimistic state, timestamp, and user intent (e.g., `toggle-complete`, `collapse-section`).

- **UI State Snapshot**
  - Collapsed headings, active filters, focused task ID, active mode.
  - Provided to shell/settings for persistence.

## Behavior

- **Rendering**
  - On new Markdown payload, parse into task tree; diff previous tree to minimize DOM churn.
  - Apply DaisyUI/Tailwind theming tokens forwarded by shell.
  - Maintain scroll position when possible, especially after toggles.

- **Modes**
  - Panel exposes mutually exclusive modes that can be switched via toolbar toggle or shell command palette.
  - **Markdown Mode** renders the complete source Markdown with syntax highlighting and section anchors for parity with the
    editor. Interaction affordances (toggle, collapse) remain available where applicable.
  - **Timeline Mode** projects tasks into a time-ordered list using due dates or schedule metadata; defaults to chronological
    ascending order with secondary grouping by heading when timestamps match.
  - Mode choice is persisted in UI state snapshot and restored on revisit; fallback to Markdown Mode when metadata is
    insufficient for Timeline Mode.

- **Interactions**
  - Toggle actions fire immediately with optimistic UI; disabled while shell confirms failure.
  - Collapse/expand headings updates UI state snapshot and notifies shell for persistence.
  - Filters (hide completed, tag filter) update derived tree locally while still respecting source order.

- **Error Handling**
  - Parsing failures emit structured errors to shell; preview shows inline fallback with retry.
  - Interaction failures (e.g., storage reject) revert optimistic state and display toast via shell.

- **Accessibility**
  - Focus cycles through tasks and section headers.
  - Keyboard shortcuts (provided via settings) trigger toggles and collapses.
  - Announce state changes via ARIA live regions.

## API Responsibilities

- **Inputs from App Shell**
  - Latest Markdown content (post-debounce) and document metadata (title, active doc ID).
  - Settings snapshot for filters, grouping, debounce, shortcut mappings.
  - Theme tokens and density preferences.

- **Outputs to App Shell**
  - Interaction events (toggle, collapse, filter change, mode switch, scroll-to-anchor).
  - Render errors with structured payload (message, stack, offending content segment).
  - UI state snapshot for persistence (collapsed headings, last focused task).

- **Contract with Code Editor Panel**
  - Preview does not mutate content directly; interactions request updates via shell, which mutates editor content.
  - Receives confirmation of updates (e.g., toggle success) through refreshed Markdown payloads.

- **Contract with Storage Layer**
  - Preview remains stateless regarding persistence; relies on shell to write changes and broadcast updates.

## Developer Experience

- **Tooling**
  - Component written in Svelte with TailwindCSS + DaisyUI tokens.
  - Unit tests using Vitest with Markdown fixtures (basic, mixed, edge cases).
  - Visual regression snapshots via Playwright (future).

- **Debugging**
  - Dev-only inspector overlay showing derived task tree and timing metrics.
  - Console warnings for unsupported syntax fallback.
  - Feature flags to toggle experimental affordances (e.g., grouping strategies).

## Example Scenarios

1. **Toggle a task**
   - User clicks checkbox → Preview immediately marks task complete → Shell persists update → Editor Markdown shows `@done(...)` → Preview re-renders confirmed state.

2. **Collapse a heading**
   - User collapses "Today" heading → Preview hides nested tasks → Emits UI state snapshot → Shell routes to settings persistence → On reload, heading remains collapsed.

3. **Filter completed tasks**
   - User enables "Hide completed" filter from preview toolbar → Preview hides completed nodes but retains counts → Filter preference stored in settings.

4. **Parsing error**
   - Malformed Markdown arrives → Preview logs error, displays inline message → Shell shows toast → Developer sees stack trace in console.

5. **Mobile navigation**
   - On mobile layout, preview renders as primary view → Toggling tasks uses large touch targets → Focus management ensures checkboxes are reachable via keyboard.

## Open Questions & Assumptions

- Should preview support inline editing for metadata in the future (e.g., due dates)?
- How granular should optimistic updates be when multiple actions happen quickly?
- Should filters be shared across documents or per-document?

Assumptions:

- MVP maintains filters per document, persisted via settings.
- Optimistic updates can be overwritten by the authoritative Markdown payload if a conflict occurs.
- Preview relies on shell for undo/redo; it only reflects state changes.

## 15. AI Handoff & Test Tracking

This section is for tracking implementation status.

- **Implemented:** _None yet (initial spec)._
- **Pending:** Parsing pipeline, optimistic toggle contract, section collapse persistence, filter toolbar wiring, accessibility audit.
- **Test coverage targets:**
  - Unit: `/apps/web/src/lib/panels/preview/__tests__/task-preview.test.ts`
  - E2E: `/apps/web/tests/preview-panel.spec.ts`
