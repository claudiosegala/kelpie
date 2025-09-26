import type { Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("I toggle {string}", async ({ page }: { page: Page }, title: string) => {
  await page.getByRole("checkbox", { name: title, exact: true }).click();
});

Then("{string} should still be checked", async ({ page }, title: string) => {
  const checkbox = page.getByLabel(title, { exact: true });
  await expect(checkbox).toBeChecked();
});
