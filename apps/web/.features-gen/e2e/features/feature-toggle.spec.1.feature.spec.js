// Generated from: e2e/features/feature-toggle.spec.1.feature
import { test } from "playwright-bdd";

test.describe("Toggle a task", () => {
  test("Mark a task complete", async ({ Given, page }) => {
    await Given('I open the app with "basic.md"', null, { page });
  });
});

// == technical section ==

test.use({
  $test: [(_context, use) => use(test), { scope: "test", box: true }],
  $uri: [(_context, use) => use("e2e/features/feature-toggle.spec.1.feature"), { scope: "test", box: true }],
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
        textWithKeyword: 'Given I open the app with "basic.md"',
        stepMatchArguments: [
          {
            group: {
              start: 20,
              value: '"basic.md"',
              children: [
                { start: 21, value: "basic.md", children: [{ children: [] }] },
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
