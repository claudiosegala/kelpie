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
    And each cluster reuses the exported layout class tokens

  Scenario: Panel toggle group only appears on mobile layouts
    When I resize the viewport to "mobile"
    Then the layout should be "mobile"
    And the panel toggle group is visible within the toolbar
    When I resize the viewport to "desktop"
    Then the panel toggle group is hidden from the DOM
