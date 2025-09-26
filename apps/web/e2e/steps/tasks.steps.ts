import { createBdd } from "playwright-bdd";
import { expect, type Locator, type Page } from "@playwright/test";

const { When, Then } = createBdd();

function markdownEditor(page: Page): Locator {
  return page.getByTestId("markdown-editor");
}

function taskTitleLocator(page: Page, title: string): Locator {
  return page.getByTestId("task-title").filter({ hasText: title }).first();
}

When("I reload the app", async ({ page }) => {
  await page.reload();
});

When("I type a new line {string}", async ({ page }, line: string) => {
  const textarea = markdownEditor(page);
  await textarea.press("End");
  await textarea.press("Enter");
  await textarea.type(line);
});

Then("{string} should appear in the parsed list", async ({ page }, title: string) => {
  const item = taskTitleLocator(page, title);
  await expect(item).toBeVisible();
});
