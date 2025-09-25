import type { Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const { Given, When, Then } = createBdd();

Given("I open the app with {string}", async ({ page }: { page: Page }, fixture) => {
  const p = path.resolve("src/lib/fixtures", fixture);
  const md = fs.readFileSync(p, "utf8");

  await page.goto("/");
  await page.evaluate((content) => {
    localStorage.setItem(
      "kelpie.todo.mmd:v1",
      JSON.stringify({
        file: content,
        ui: { panes: {}, activeFilters: {} },
        meta: { version: 1 }
      })
    );
  }, md);
  await page.reload();
});

When("I toggle {string}", async ({ page }: { page: Page }, title: string) => {
  await page.getByRole("checkbox", { name: title, exact: true }).click();
});

Then("the Markdown contains {string}", async ({ page }: { page: Page }, needle: string) => {
  const md = await page.evaluate(
    () => JSON.parse(localStorage.getItem("kelpie.todo.mmd:v1")!).file
  );
  expect(md).toContain(needle);
});
