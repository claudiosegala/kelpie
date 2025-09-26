# Toolbar Spec

## Introduction

The **Kelpie Toolbar** is the persistent header for the web app shell. It surfaces
branding, exposes layout controls, and provides quick access to theming and save
state information. The toolbar must stay visible, work across desktop and mobile
layouts, and forward user intents to the shell stores that orchestrate the rest of
the workspace.

## Outcomes

- **For users**:
  - Always see where they are (brand + version) and the current save status.
  - Switch between panels or view modes with one tap/click, even on mobile.
  - Toggle themes without navigating away or digging into settings.
- **For developers**:
  - A single surface for wiring shell interactions (view mode, active panel,
    theme, save state).
  - Predictable composition of toolbar subcomponents with minimal layout logic
    in the shell.

## Goals

- Keep toolbar visible (sticky) so save state and controls are always accessible.
- Provide consistent affordances for switching panels (mobile) and view modes
  (all breakpoints).
- Surface save status prominently while remaining responsive in narrow layouts.
- Expose theme toggle with contextual labels for accessibility.
- Avoid duplicating shell state logic—delegate interactions to dedicated stores.

## Scope

**Included for MVP:**

- Sticky, blurred header with brand, version tooltip, and responsive spacing.
- Embedding of `PanelToggleGroup`, `SaveIndicator`, `ViewModeToggleButton`, and
  `ThemeToggleButton` components.
- Passing version string into branding tooltip copy.
- Layout rules that keep controls grouped and right-aligned while allowing wrap
  on narrow viewports.

**Excluded for MVP:**

- Contextual help / docs links.
- Customization of toolbar contents via user settings.
- Server-driven branding.

## Structure

- Layout utility tokens for the wrapper, brand cluster, controls cluster, and
  save indicator wrapper live in `toolbar.constants.ts` so Tailwind class lists
  stay co-located with other toolbar primitives.
- `<header>` wrapper uses a sticky position at the top with slight background
  transparency and blur so content scrolls beneath it without losing contrast.
- Left cluster renders the `ToolbarBrand` subcomponent which encapsulates all
  branding copy, tooltip composition, and typography styles. The cluster is
  addressable via `data-testid="toolbar-brand-cluster"` for instrumentation.
- Right cluster (`flex-1` container) is exported as
  `TOOLBAR_CONTROLS_CLUSTER_CLASSES` and carries `data-testid="toolbar-controls-cluster"`:
  - `PanelToggleGroup` (renders only when layout is mobile via its own logic).
  - `SaveIndicator` contained in a width-constrained wrapper for stability and
    labeled with `data-testid="toolbar-save-indicator-wrapper"`.
  - `ViewModeToggleButton` for switching between editor/preview/settings modes.
  - `ThemeToggleButton` for switching between light/dark themes.

## Behavior

- Branding tooltip is derived by `ToolbarBrand` via the shared
  `buildBrandTooltip(version)` helper which trims input and falls back to
  "Unknown" when the string is empty. The tooltip appears on hover/focus via
  DaisyUI `tooltip` classes and is duplicated in the `title` attribute for
  accessibility.
- `PanelToggleGroup` subscribes to shell layout state and only renders controls
  when mobile; toolbar always renders the component so desktop markup stays
  consistent.
- `SaveIndicator` is always visible; it adapts width for mobile vs. desktop and
  reads from the persistence store to show status, timestamp, and tooltip.
- `ViewModeToggleButton` updates shell view mode store; the toolbar does not
  manage state beyond hosting the control.
- `ThemeToggleButton` toggles theme store state and reflects the current mode via
  icon swap and accessible label.
- Controls are grouped with `flex` and `gap` utilities so they wrap neatly on
  small screens while remaining right-aligned.

## Accessibility

- Header uses semantic `<header>` element and keeps interactive controls within
  accessible buttons.
- `ToolbarBrand` duplicates tooltip content in both `data-tip` and `title`
  attributes so screen readers announce version and description when focused.
- Save indicator uses `aria-live="polite"` and `role="status"` for updates,
  enabling non-visual users to hear state changes without focus theft.
- Toggle buttons expose `aria-label`, `aria-pressed`, and `role="group"` where
  appropriate via their child components.

## Assumptions

- `version` prop is supplied by the shell route and may occasionally be empty;
  `ToolbarBrand` guards against blanks when generating tooltip text.
- Layout detection (desktop vs. mobile) is fully owned by shell stores and is
  trustworthy when deciding whether `PanelToggleGroup` should show.
- Theme store only supports two themes (light/dark) today; button labels reflect
  that binary choice.

## Future Improvements

- Surface contextual help and onboarding links once the information architecture is ready.
- Provide toolbar personalization so teams can pin additional controls without code changes.
- Localize tooltip copy and control labels once i18n infrastructure lands.

## Maintainability Considerations

- Shared constants keep branding strings in `toolbar.constants.ts` so copy edits
  land in one place and Svelte components stay focused on layout concerns.
- `ToolbarBrand` isolates tooltip formatting logic, ensuring downstream
  refactors or localization can swap implementations without touching
  `Toolbar.svelte`.
- Toolbar composition favors declarative stacking of imported components instead
  of inline helpers, so future additions (e.g., help menus) can be inserted by
  adding one more component import.
- Layout class tokens and testing IDs are centralized in
  `toolbar.constants.ts`, keeping styling, instrumentation, and tests aligned
  without string duplication inside the Svelte markup.
- `TOOLBAR_TEST_IDS` expose stable selectors so unit tests can target
  high-level clusters without depending on specific DOM structures.

## Test Scenarios (Gherkin)

```gherkin
Feature: Toolbar interactions
  The toolbar should keep key workspace controls available across devices.

  Background:
    Given I open the app with "basic.md"

  Scenario: Branding tooltip communicates version and purpose
    Then the toolbar brand tooltip contains "Kelpie 0.0.0-dev"
    And the tooltip explains it is the markdown to-do studio

  Scenario: Save indicator is always present
    Then the toolbar displays the save indicator component
    And the save indicator announces updates politely

  Scenario: View mode switch updates shell state
    When I choose the "Preview" view mode
    Then the "Preview" panel should be visible
    And the "Preview" view mode toggle is marked as active

  Scenario: Theme toggle reflects current theme
    Given the stored theme preference is cleared
    When I toggle the theme from the toolbar
    Then the document theme should be "dark"
    And the theme toggle label reads "Switch to light theme"

  Scenario: Toolbar exposes stable layout clusters
    Then the toolbar root uses the exported wrapper classes
    And the brand cluster test id is available for instrumentation
    And the controls cluster includes the save indicator wrapper and workspace controls

  Scenario: Panel toggle group only appears on mobile layouts
    When I resize the viewport to "mobile"
    Then the layout should be "mobile"
    And the panel toggle group is visible within the toolbar
    When I resize the viewport to "desktop"
    Then the panel toggle group is hidden
```
