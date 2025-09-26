// Generated from: e2e/features/feature-toggle.spec.2.feature
import { test } from "playwright-bdd";

test.describe("Toggle tasks", () => {
  test("Mark a task complete and persist", async ({ Given, page }) => {
    await Given('I open the app with "mixed.md"', null, { page });
  });
});

// == technical section ==

test.use({
  $test: [(_context, use) => use(test), { scope: "test", box: true }],
  $uri: [(_context, use) => use("e2e/features/feature-toggle.spec.2.feature"), { scope: "test", box: true }],
  $bddFileData: [(_context, use) => use(bddFileData), { scope: "test", box: true }]
});

const bddFileData = [
  // bdd-data-start
  {
    pwTestLine: 6,
    pickleLine: 3,
    tags: [],
    steps: [
      {
        pwStepLine: 7,
        gherkinStepLine: 4,
        keywordType: "Context",
        textWithKeyword: 'Given I open the app with "mixed.md"',
        stepMatchArguments: [
          {
            group: {
              start: 20,
              value: '"mixed.md"',
              children: [
                { start: 21, value: "mixed.md", children: [{ children: [] }] },
                { children: [{ children: [] }] }
              ]
            },
            parameterTypeName: "string"
          }
        ]
      }
    ]
  }
]; // bdd-data-end
