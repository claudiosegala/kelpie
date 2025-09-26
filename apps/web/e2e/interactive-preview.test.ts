import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "kelpie.todo.mmd:v1";

test.describe("interactive preview", () => {
  async function loadDocument(page: Page, markdown: string) {
    await page.goto("/");
    await page.evaluate(
      ([key, file]) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            file,
            ui: { panes: {}, activeFilters: {} },
            meta: { version: 1 }
          })
        );
      },
      [STORAGE_KEY, markdown] as const
    );
    await page.reload();
  }

  async function getStoredMarkdown(page: Page): Promise<string> {
    const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    if (!raw) {
      throw new Error("expected markdown to be persisted in localStorage");
    }
    const payload = JSON.parse(raw) as { file: string };
    return payload.file;
  }

  test("renders metadata badges for parsed tasks", async ({ page }) => {
    await loadDocument(page, "- [ ] Plan trip @due(2025-12-24) #travel #planning");

    const taskCard = page
      .locator("li", {
        has: page.getByRole("checkbox", { name: "Toggle Plan trip" })
      })
      .first();

    await expect(taskCard).toBeVisible();
    await expect(taskCard).toHaveAttribute("data-completed", "false");
    await expect(taskCard.getByText("2025-12-24", { exact: true })).toBeVisible();
    await expect(taskCard.getByText("#travel", { exact: true })).toBeVisible();
    await expect(taskCard.getByText("#planning", { exact: true })).toBeVisible();
  });

  test("updates preview when editing the markdown document", async ({ page }) => {
    await loadDocument(page, "- [ ] Draft outline");

    const editor = page.getByLabel("Markdown editor");
    const original = await editor.inputValue();
    const appendedLine = "\n- [ ] Capture inspiration @due(2025-08-15) #inbox";
    await editor.fill(`${original}${appendedLine}`);

    const newTaskCard = page.locator("li", {
      has: page.getByRole("checkbox", { name: "Toggle Capture inspiration" })
    });

    await expect(newTaskCard).toBeVisible();
    await expect(newTaskCard.getByText("Capture inspiration", { exact: false })).toBeVisible();
    await expect(newTaskCard.getByText("2025-08-15", { exact: true })).toBeVisible();
    await expect(newTaskCard.getByText("#inbox", { exact: true })).toBeVisible();
  });

  test("shows an empty state when no tasks are parsed", async ({ page }) => {
    await loadDocument(page, "");

    const emptyState = page.getByText("No tasks parsed yet — start typing in the editor to see them here.", {
      exact: true
    });

    await expect(emptyState).toBeVisible();
  });

  test("persists toggled tasks back into markdown", async ({ page }) => {
    await loadDocument(page, "- [ ] Verify persistence");

    const checkbox = page.getByRole("checkbox", { name: "Toggle Verify persistence" });
    await checkbox.check();

    const taskCard = page.locator("li", {
      has: checkbox
    });
    await expect(taskCard).toHaveAttribute("data-completed", "true");

    const storedMarkdown = await getStoredMarkdown(page);
    expect(storedMarkdown).toContain("- [x] Verify persistence");
  });
});
