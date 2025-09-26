import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

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

  function escapeAttribute(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function taskCardByTitle(page: Page, title: string): Locator {
    const escapedTitle = escapeAttribute(title);
    return page.locator(`[data-testid="task-card"][data-task-title="${escapedTitle}"]`).first();
  }

  test("renders metadata badges for parsed tasks", async ({ page }) => {
    await loadDocument(page, "- [ ] Plan trip @due(2025-12-24) #travel #planning");

    const taskCard = page.getByTestId("task-card").first();

    await expect(taskCard).toBeVisible();
    await expect(taskCard).toHaveAttribute("data-completed", "false");
    await expect(taskCard.getByTestId("task-due")).toHaveText(/2025-12-24/);
    await expect(taskCard.getByTestId("task-hashtag").filter({ hasText: "#travel" })).toBeVisible();
    await expect(taskCard.getByTestId("task-hashtag").filter({ hasText: "#planning" })).toBeVisible();
  });

  test("updates preview when editing the markdown document", async ({ page }) => {
    await loadDocument(page, "- [ ] Draft outline");

    const editor = page.getByTestId("markdown-editor");
    const original = await editor.inputValue();
    const appendedLine = "\n- [ ] Capture inspiration @due(2025-08-15) #inbox";
    await editor.fill(`${original}${appendedLine}`);

    const newTaskCard = taskCardByTitle(page, "Capture inspiration");

    await expect(newTaskCard).toBeVisible();
    await expect(newTaskCard.getByTestId("task-title")).toContainText("Capture inspiration");
    await expect(newTaskCard.getByTestId("task-due")).toHaveText(/2025-08-15/);
    await expect(newTaskCard.getByTestId("task-hashtag").filter({ hasText: "#inbox" })).toBeVisible();
  });

  test("shows an empty state when no tasks are parsed", async ({ page }) => {
    await loadDocument(page, "");

    const emptyState = page.getByTestId("tasks-empty-state");

    await expect(emptyState).toBeVisible();
  });

  test("persists toggled tasks back into markdown", async ({ page }) => {
    await loadDocument(page, "- [ ] Verify persistence");

    const taskCard = taskCardByTitle(page, "Verify persistence");
    const checkbox = taskCard.getByTestId("task-checkbox");
    await checkbox.check();

    await expect(taskCard).toHaveAttribute("data-completed", "true");

    const storedMarkdown = await getStoredMarkdown(page);
    expect(storedMarkdown).toContain("- [x] Verify persistence");
  });
});
