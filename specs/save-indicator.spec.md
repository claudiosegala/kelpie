# Save Indicator Spec

## 1. Overview

The **Save Indicator** is a Svelte component that appears in the Kelpie web shell toolbar. It mirrors the persistence status
emitted by `$lib/stores/persistence` so that people always know whether their current work has been stored on the device. The
component is purely presentational: it reads the persistence store, derives copy and styling, and renders a badge with matching
iconography, tooltip guidance, and (when available) a last-saved timestamp.

## 2. Inputs and Dependencies

- Subscribes to `saveStatus` from `$lib/stores/persistence`.
- The store yields objects that satisfy `SaveStatus` from `$lib/app-shell/contracts` with four possible `kind` values: `idle`,
  `saving`, `saved`, and `error`.
- Imports `SaveIndicatorIcon.svelte` to render the glyph that matches the current tone. The icon component owns the SVG choices.

## 3. State Derivation Model

The component derives all rendered output from two configuration maps:

| Source          | Purpose                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| `STATUS_CONFIG` | Declares the tooltip, tone token, and saving animation flag for each `SaveStatus["kind"]`. |
| `TONE_CLASSES`  | Converts tone tokens (`success`, `info`, `error`) into the badge and icon class strings.   |

A helper `resolveIndicatorState(status: SaveStatus)` combines both maps with runtime data (e.g., timestamps) to emit a
normalized `IndicatorState` that drives the template. This keeps behaviour changes in a single place and avoids scattering
conditional logic across the markup.

## 4. Visual Anatomy

- **Tooltip wrapper** – wraps the badge in `tooltip tooltip-bottom` classes so DaisyUI displays contextual guidance on hover or
  focus. The tooltip body is mirrored in the `title` attribute for native browser support.
- **Status badge** – `badge badge-lg` element styled via tone-specific classes. It stretches to full width on small screens and
  reverts to auto width on larger breakpoints for toolbar alignment.
- **Icon slot** – renders `SaveIndicatorIcon` with the status `kind` and computed tone class.
- **Label** – a text node showing `IndicatorState.label`, wrapped in `.indicator__label` for consistent spacing.
- **Timestamp chip (optional)** – appended in `.indicator__timestamp` whenever the status is `saved` and includes a `timestamp`.

## 5. Behaviour

1. **Status subscription**
   - The component reacts to `saveStatus` updates through Svelte's `$` auto-subscription.
   - `IndicatorState.label` mirrors `status.message` verbatim so store copy appears without modification.
2. **Tone mapping**
   - Status kinds map to a tone token using `STATUS_CONFIG` and fall back to the `saved` configuration for unknown values.
   - Tone tokens resolve to class strings via `TONE_CLASSES`. Both badge and icon classes originate from this mapping so visual
     adjustments stay in one place.
3. **Tooltip messaging**
   - `idle`, `saving`, and `saved` states share the local-storage guidance tooltip: "Changes are stored locally on this device for
     now. Cloud sync will be introduced in a future release."
   - `error` status swaps to an error guidance tooltip: "We couldn't save locally. Retry or export your data to keep a copy while
     we work on cloud sync."
   - When a saved timestamp exists, `buildTooltipMessage` appends `Last saved at {formatted time}.` on a new line.
4. **Timestamp formatting**
   - `formatSavedTimestamp` returns a localized time string when `status.kind === "saved"` and `timestamp` is present; other
     states omit the timestamp chip entirely.
5. **Saving animation**
   - When `IndicatorState.isSaving` is true, the badge gains `indicator--saving animate-pulse` so the UI visibly pulses while
     persistence is in flight.
6. **Accessibility**
   - The badge is marked `role="status"` with `aria-live="polite"` so screen readers announce updates without being intrusive.
   - `aria-label` concatenates the human-readable message with the tooltip guidance, ensuring non-visual users hear both pieces of
     context.
   - `tabindex="0"` keeps the badge reachable by keyboard, and the tooltip wrapper duplicates the content for hover/focus use.

## 6. Assumptions

- The `saveStatus` store is the single source of truth; the component does not accept props to override it.
- Status messages for `idle`, `saving`, and `saved` are stable strings controlled by the store. Custom copy (e.g., error
  messages) is passed through as-is.
- Timestamp values are millisecond epochs. If the store emits `null` or `undefined` timestamps, the component hides the timestamp
  UI without logging errors.

## 7. Future Improvements

- Surface relative timestamps ("Saved 2 minutes ago") while retaining a precise absolute time in the tooltip.
- Offer optional cloud-sync messaging once remote persistence is implemented.
- Provide retry affordances (e.g., a button) directly within the indicator when an error occurs.
- Localize tooltip copy and the timestamp format using the shell's i18n pipeline.
- Animate the transition between states (e.g., fade between icons) for smoother perception.

## 8. Testing Guidance

Unit tests live at `/apps/web/src/lib/app-shell/SaveIndicator.test.ts` and should continue to cover:

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
