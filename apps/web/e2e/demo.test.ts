import { expect, test } from '@playwright/test';

test.describe('task persistence', () => {
        test.beforeEach(async ({ page }) => {
                await page.goto('/');
                await page.evaluate(() => localStorage.clear());
                await page.reload();
        });

        test('toggled tasks remain checked after reloading the app', async ({ page }) => {
                const tasks = page.locator('.task-item');
                await expect(tasks).toHaveCount(2);

                const firstTask = tasks.first();
                await expect(firstTask).toContainText('Buy milk');

                const firstCheckbox = firstTask.getByRole('checkbox');
                await firstCheckbox.check();
                await expect(firstCheckbox).toBeChecked();
                await expect(firstTask).toHaveClass(/done/);

                await page.reload();

                const tasksAfterReload = page.locator('.task-item');
                await expect(tasksAfterReload).toHaveCount(2);

                const firstAfterReload = tasksAfterReload.first();
                await expect(firstAfterReload).toHaveClass(/done/);
                await expect(firstAfterReload.getByRole('checkbox')).toBeChecked();
        });
});
