Feature: Toggle a task
  Scenario: Mark a task complete
    Given I open the app with "basic.md"
    When I toggle "Buy milk"
    Then the Markdown contains "@done("