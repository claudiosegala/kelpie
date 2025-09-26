import type { Locator, Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

function escapeAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function taskCard(page: Page, title: string): Locator {
  const escapedTitle = escapeAttribute(title);
  return page.locator(`[data-testid="task-card"][data-task-title="${escapedTitle}"]`).first();
}

When("I toggle {string}", async ({ page }: { page: Page }, title: string) => {
  const card = taskCard(page, title);
  await card.getByTestId("task-checkbox").click();
});

Then("{string} should still be checked", async ({ page }, title: string) => {
  const checkbox = taskCard(page, title).getByTestId("task-checkbox");
  await expect(checkbox).toBeChecked();
});
