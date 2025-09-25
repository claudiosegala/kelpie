# Toggle behavior

```gherkin
Feature: Toggle a task

  Scenario: Mark a task complete
    Given I open the app with "basic.md"
    When I toggle "Buy milk"
    Then the Markdown contains "@done("
```


```gherkin
Feature: Toggle tasks

  Scenario: Mark a task complete and persist
    Given I open the app with "fixtures/mixed.md"
    When I toggle "Task A"
    Then the Markdown contains "@done("
    And I reload the app
    Then "Task A" should still be checked
```


```gherkin
Feature: Add new tasks

  Scenario: Add a new line in Markdown and see it parsed
    Given I open the app with "fixtures/mixed.md"
    When I type a new line "- [ ] New Task #new"
    Then "New Task" should appear in the parsed list
```
