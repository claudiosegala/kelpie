import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const { Given, When, Then } = createBdd();

const STORAGE_KEY = "kelpie.todo.mmd:v1";

Given("I open the app with {string}", async ({ page }, fixture: string) => {
  const filePath = path.resolve("apps/web/src/lib/fixtures", fixture);
  const md = fs.readFileSync(filePath, "utf8");
  await page.goto("/");
  await page.evaluate(
    ([key, content]) =>
      localStorage.setItem(
        key || "", // TODO: remove this null treatment
        JSON.stringify({
          file: content,
          ui: { panes: {}, activeFilters: {} },
          meta: { version: 1 }
        })
      ),
    [STORAGE_KEY, md]
  );
  await page.reload();
});

When("I toggle {string}", async ({ page }, title: string) => {
  await page.getByLabel(title, { exact: true }).check();
});

Then("the Markdown contains {string}", async ({ page }, needle: string) => {
  const md: string | null = await page.evaluate((key: string) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { file: string }).file : null;
  }, STORAGE_KEY);

  expect(md).not.toBeNull();
  expect(md!).toContain(needle);
});

Then("{string} should still be checked", async ({ page }, title: string) => {
  const checkbox = page.getByLabel(title, { exact: true });
  await expect(checkbox).toBeChecked();
});

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
