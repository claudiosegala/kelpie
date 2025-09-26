# Save Indicator Spec

## 1. Overview

The **Save Indicator** is a Svelte component embedded in the toolbar of the Kelpie web shell. It reflects the persistence status
exposed by `$lib/stores/persistence` so users always know whether their work is safely stored on the device. The component is a
pure consumer of the `saveStatus` store and does not trigger any persistence itself. Instead, it translates store state into a
badge with matching iconography, copy, and tooltip guidance for offline-first saving.

## 2. Inputs and Dependencies

- Subscribes to `saveStatus` from `$lib/stores/persistence`.
- Expects the store to yield objects matching `SaveStatus` from `$lib/app-shell/contracts` with four possible `kind` values:
  `idle`, `saving`, `saved`, and `error`.
- Imports `SaveIndicatorIcon.svelte` to render the status glyph; the icon component is responsible for choosing the SVG based on
  the provided `kind` and `toneClass`.
- Pulls shared UI configuration from `save-indicator.config.ts`, which centralizes tone classes, tooltip copy, and timestamp
  helpers for both the component and tests.

## 3. Configuration model

All tone styling and tooltip guidance live in `SAVE_INDICATOR_CONFIG`. The map keys are `SaveStatusKind` values and each entry
defines:

- `tone.badge` – Tailwind classes applied to the badge container.
- `tone.icon` – Tailwind classes forwarded to `SaveIndicatorIcon`.
- `tooltip` – Base tooltip message for that status.

`DEFAULT_KIND` falls back to `saved` so unexpected states borrow the success styling, and `LOCAL_SAVE_TOOLTIP` / `ERROR_TOOLTIP`
are exported constants reused by the tests.

`save-indicator.config.ts` also exposes `SaveIndicatorTimestampDetails`, `toneFor`, `tooltipFor`, and `getTimestampDetails`, which
are consumed by both the component and the view-model so tests can assert behaviour without touching component internals.

## 4. View-model layer

`save-indicator.viewmodel.ts` concentrates all derived presentation logic in `buildSaveIndicatorViewModel(status)` so the Svelte
component only binds to a single reactive object. The view-model contains:

- `kind` / `label` – for data attributes, icon binding, and screen-reader copy.
- `badgeClasses` / `iconToneClass` – class strings assembled from config tone data and state-specific modifiers (e.g., pulsing
  while saving).
- `tooltipMessage` – base tooltip copy optionally appended with timestamp guidance.
- `timestampDetails` – the formatted chip text and tooltip suffix returned by `getTimestampDetails`.
- `ariaLabel` – the concatenated label and tooltip so assistive tech hears identical copy to sighted users.

Helpers such as `buildBadgeClasses` keep CSS class concatenation in one place, improving maintainability if the badge needs new
modifiers in the future.

## 5. Visual Anatomy

- **Tooltip wrapper** – wraps the badge in `tooltip tooltip-bottom` classes so DaisyUI shows contextual guidance on hover or
  focus. All tooltip copy is duplicated in the `title` attribute to support native browser tooltips.
- **Status badge** – a `badge badge-lg` element styled via tone-specific classes. It stretches to full width on small screens
  and reverts to auto width on larger breakpoints for toolbar alignment.
- **Icon slot** – renders `SaveIndicatorIcon` with the current status and tone class.
- **Label** – text node showing `status.message`, wrapped in `.indicator__label` for consistent spacing.
- **Timestamp chip (optional)** – appended in `.indicator__timestamp` whenever the status is `saved` and includes a numeric
  `timestamp`.

## 6. Behaviour

1. **Status subscription**
   - The component reacts to `saveStatus` updates immediately via Svelte's `$` auto-subscription.

- `viewModel.label` mirrors `status.message` verbatim so store copy appears without modifications.

2. **Tone mapping**

- `toneFor(status.kind)` pulls the tone definition from the configuration map.
- If an unknown status slips through, the helper falls back to the `DEFAULT_KIND` entry.

3. **Tooltip messaging**

- `tooltipFor(status.kind)` resolves the base tooltip text.
- `idle`, `saving`, and `saved` states share the local-storage guidance tooltip
  (`LOCAL_SAVE_TOOLTIP`).
- `error` status swaps to the retry guidance tooltip (`ERROR_TOOLTIP`).
- When timestamp details are available, `buildSaveIndicatorViewModel` appends `Last saved at {formatted time}.` on a new line.

4. **Timestamp formatting**

- `getTimestampDetails(status)` returns `undefined` for non-saved states.
- For `kind === "saved"` with a `timestamp`, the helper formats the time via `toLocaleTimeString()` and returns both the badge
  chip copy (wrapped in parentheses) and the tooltip suffix.

5. **Saving animation**

- `buildBadgeClasses` adds `indicator--saving animate-pulse` when the status is `saving` so the UI visibly pulses while
  persistence is in flight.

6. **Accessibility**

- The badge is marked `role="status"` with `aria-live="polite"` so screen readers announce updates without being intrusive.
- `viewModel.ariaLabel` concatenates the human-readable message with the tooltip guidance, ensuring non-visual users hear both
  pieces of context.
- `tabindex="0"` keeps the badge reachable by keyboard, and the tooltip wrapper duplicates the content for hover/focus use.

## 7. Assumptions

- The `saveStatus` store is the single source of truth; the component does not accept props to override it.
- Status messages for `idle`, `saving`, and `saved` are stable strings controlled by the store. Custom copy (e.g., error
  messages) is passed through as-is.
- Timestamp values are millisecond epochs. If the store emits `null` or `undefined` timestamps, the component simply hides the
  timestamp UI without logging errors.

## 8. Future Improvements

- Surface relative timestamps ("Saved 2 minutes ago") while retaining a precise absolute time in the tooltip.
- Offer optional cloud-sync messaging once remote persistence is implemented.
- Provide retry affordances (e.g., a button) directly within the indicator when an error occurs.
- Localize tooltip copy and the timestamp format using the shell's i18n pipeline.
- Animate the transition between states (e.g., fade between icons) for smoother perception.

## 9. Testing Guidance

Unit tests currently live at `/apps/web/src/lib/app-shell/SaveIndicator.test.ts` and should continue to cover:

- Default rendering of the idle state with tooltip copy.
- Saving state pulse animation and aria labeling.
- Saved state timestamp visibility when the store emits a `saved` status.
- Error state tooltip, message, and aria text passthrough.

### Gherkin Scenarios

```gherkin
Feature: Save status indicator
  The toolbar badge communicates persistence state so users trust the offline save system.

  Background:
    Given the user has the app shell open

  Scenario: Viewing the idle state on load
    When the save status store reports "idle"
    Then the indicator shows "Saved locally ✓"
    And the badge tone is styled for success
    And the tooltip explains that changes are stored locally for now

  Scenario: Seeing feedback while saving
    Given the save status store reports "saving"
    Then the indicator shows "Saving locally…"
    And the badge pulses to indicate activity
    And the tooltip still describes local storage

  Scenario: Showing a timestamp after a successful save
    Given the save status store reports "saved" with a recent timestamp
    Then the indicator shows "Saved locally ✓"
    And the timestamp is displayed in parentheses with the local time
    And the tooltip includes the last saved time on a new line

  Scenario: Surfacing a persistence error
    Given the save status store reports "error" with message "Disk full"
    Then the indicator shows "Disk full"
    And the badge tone switches to error styling
    And the tooltip advises retrying or exporting data
```
