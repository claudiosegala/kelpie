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
