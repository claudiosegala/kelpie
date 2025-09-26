import { expect, test } from "@playwright/test";

test.describe("task persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("toggled tasks remain checked after reloading the app", async ({ page }) => {
    const tasks = page.getByTestId("task-card");
    await expect(tasks).toHaveCount(2);

    const firstTask = tasks.first();
    await expect(firstTask).toContainText("Buy milk");

    const firstCheckbox = firstTask.getByTestId("task-checkbox");
    await firstCheckbox.check();
    await expect(firstCheckbox).toBeChecked();
    await expect(firstTask).toHaveAttribute("data-completed", "true");

    await page.reload();

    const tasksAfterReload = page.getByTestId("task-card");
    await expect(tasksAfterReload).toHaveCount(2);

    const firstAfterReload = tasksAfterReload.first();
    await expect(firstAfterReload).toHaveAttribute("data-completed", "true");
    await expect(firstAfterReload.getByTestId("task-checkbox")).toBeChecked();
  });
});
