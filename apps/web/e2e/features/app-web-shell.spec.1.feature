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