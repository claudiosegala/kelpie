Feature: App shell layout controls
  Background:
    Given I open the app with "basic.md"

  Scenario: Switching to preview-only hides the editor on desktop
    When I choose the "Preview" view mode
    Then the "Code editor" panel should be hidden
    And the "Preview" panel should be visible

  Scenario: Switching to settings shows only the settings panel
    When I choose the "Settings" view mode
    Then the "Code editor" panel should be hidden
    And the "Preview" panel should be hidden
    And the "Settings" panel should be visible

  Scenario: Mobile layout users can switch between panels
    When I resize the viewport to "mobile"
    Then the layout should be "mobile"
    And the "Code editor" panel should be visible
    And the "Preview" panel should be hidden
    And the "Settings" panel should be hidden
    When I switch to the "Preview" panel
    Then the "Preview" panel should be visible
    And the "Code editor" panel should be hidden
    And the "Settings" panel should be hidden
    When I choose the "Settings" view mode
    Then the "Settings" panel should be visible
    And the "Code editor" panel should be hidden
    And the "Preview" panel should be hidden
