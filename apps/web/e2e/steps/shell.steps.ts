import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();

const shellTestId = "app-shell";

const viewModeIds = new Map<string, string>([
  ["Editor & preview", "editor-preview"],
  ["Preview", "preview-only"],
  ["Settings", "settings"]
]);

const panelIds = new Map<string, string>([
  ["Editor", "editor"],
  ["Code editor", "editor"],
  ["Preview", "preview"],
  ["Settings", "settings"]
]);

function getTestId(map: Map<string, string>, label: string, kind: string): string {
  const id = map.get(label);
  if (!id) {
    throw new Error(`Unknown ${kind} label: ${label}`);
  }

  return id;
}

When("I choose the {string} view mode", async ({ page }, label: string) => {
  const viewModeId = getTestId(viewModeIds, label, "view mode");
  const button = page.getByTestId(`view-mode-${viewModeId}`);

  await expect(button).toBeVisible();
  await button.click();
});

When("I switch to the {string} panel", async ({ page }, label: string) => {
  const panelId = getTestId(panelIds, label, "panel");
  const button = page.getByTestId(`panel-toggle-${panelId}`);

  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
});

When("I resize the viewport to {string}", async ({ page }, layout: string) => {
  const normalized = layout.toLowerCase();
  const viewport =
    normalized === "mobile"
      ? { width: 600, height: 900 }
      : normalized === "desktop"
        ? { width: 1280, height: 720 }
        : null;

  if (!viewport) {
    throw new Error(`Unknown layout preset: ${layout}`);
  }

  await page.setViewportSize(viewport);

  const targetLayout = normalized === "mobile" ? "mobile" : "desktop";
  const shell = page.getByTestId(shellTestId);
  await expect(shell).toHaveAttribute("data-layout", targetLayout);
});

Then("the layout should be {string}", async ({ page }, layout: string) => {
  const shell = page.getByTestId(shellTestId);
  await expect(shell).toHaveAttribute("data-layout", layout);
});

function panelLocator(page: Page, label: string) {
  return page.getByRole("region", { name: label, exact: true });
}

Then("the {string} panel should be visible", async ({ page }, label: string) => {
  const panel = panelLocator(page, label);
  await expect(panel).toBeVisible();
});

Then("the {string} panel should be hidden", async ({ page }, label: string) => {
  const panel = panelLocator(page, label);
  await expect(panel).toHaveJSProperty("hidden", true);
});
