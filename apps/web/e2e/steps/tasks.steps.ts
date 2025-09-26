import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("I reload the app", async ({ page }) => {
  await page.reload();
});

When("I type a new line {string}", async ({ page }, line: string) => {
  const textarea = page.locator("textarea");
  await textarea.press("End");
  await textarea.press("Enter");
  await textarea.type(line);
});

Then("{string} should appear in the parsed list", async ({ page }, title: string) => {
  const item = page.getByText(title, { exact: true });
  await expect(item).toBeVisible();
});
