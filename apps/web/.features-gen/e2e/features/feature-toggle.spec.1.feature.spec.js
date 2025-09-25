// Generated from: e2e/features/feature-toggle.spec.1.feature
import { test } from "playwright-bdd";

test.describe('Toggle a task', () => {

  test('Mark a task complete', async ({ Given, When, Then, page }) => { 
    await Given('I open the app with "basic.md"', null, { page }); 
    await When('I toggle "Buy milk"', null, { page }); 
    await Then('the Markdown contains "@done("', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/feature-toggle.spec.1.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":2,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":3,"keywordType":"Context","textWithKeyword":"Given I open the app with \"basic.md\"","stepMatchArguments":[{"group":{"start":20,"value":"\"basic.md\"","children":[{"start":21,"value":"basic.md","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":8,"gherkinStepLine":4,"keywordType":"Action","textWithKeyword":"When I toggle \"Buy milk\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Buy milk\"","children":[{"start":10,"value":"Buy milk","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then the Markdown contains \"@done(\"","stepMatchArguments":[{"group":{"start":22,"value":"\"@done(\"","children":[{"start":23,"value":"@done(","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end