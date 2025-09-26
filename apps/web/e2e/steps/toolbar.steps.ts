import { expect, type Locator } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import {
  TOOLBAR_BRAND_CLUSTER_CLASSES,
  TOOLBAR_CONTROLS_CLUSTER_CLASSES,
  TOOLBAR_SAVE_INDICATOR_WRAPPER_CLASSES,
  TOOLBAR_TEST_IDS,
  TOOLBAR_WRAPPER_CLASSES
} from "../../src/lib/app-shell/toolbar.constants";

const { Given, When, Then } = createBdd();

const viewModeIds = new Map<string, string>([
  ["editor & preview", "editor-preview"],
  ["preview", "preview-only"],
  ["settings", "settings"]
]);

async function expectLocatorHasClasses(locator: Locator, classes: string): Promise<void> {
  const classList = await locator.getAttribute("class");
  const actual = new Set(
    (classList ?? "")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
  );
  const expected = classes
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const className of expected) {
    expect(actual.has(className)).toBe(true);
  }
}

Then("the toolbar brand tooltip contains {string}", async ({ page }, expected: string) => {
  const tooltip = page.getByTestId("toolbar-brand-tooltip");
  await expect(tooltip).toBeVisible();
  const escaped = expected.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  await expect(tooltip).toHaveAttribute("data-tip", new RegExp(escaped));
});

Then("the tooltip explains it is the markdown to-do studio", async ({ page }) => {
  const tooltip = page.getByTestId("toolbar-brand-tooltip");
  await expect(tooltip).toHaveAttribute("data-tip", /Markdown to-do studio — edit, preview, and fine-tune your flow\./);
});

Then("the toolbar displays the save indicator component", async ({ page }) => {
  await expect(page.getByTestId("save-indicator")).toBeVisible();
});

Then("the toolbar root uses the exported wrapper classes", async ({ page }) => {
  const root = page.getByTestId(TOOLBAR_TEST_IDS.root);
  await expect(root).toBeVisible();
  await expectLocatorHasClasses(root, TOOLBAR_WRAPPER_CLASSES);
});

Then("the brand cluster test id is available for instrumentation", async ({ page }) => {
  await expect(page.getByTestId(TOOLBAR_TEST_IDS.brandCluster)).toBeVisible();
});

Then("the controls cluster includes the save indicator wrapper and workspace controls", async ({ page }) => {
  const controlsCluster = page.getByTestId(TOOLBAR_TEST_IDS.controlsCluster);
  await expect(controlsCluster).toBeVisible();

  const saveIndicatorWrapper = controlsCluster.getByTestId(TOOLBAR_TEST_IDS.saveIndicatorWrapper);
  await expect(saveIndicatorWrapper).toBeVisible();
  await expect(saveIndicatorWrapper.getByTestId("save-indicator")).toBeVisible();

  await expect(page.getByRole("group", { name: "Select workspace mode" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Switch to (dark|light) theme/i })).toBeVisible();
});

Then("each cluster reuses the exported layout class tokens", async ({ page }) => {
  const brandCluster = page.getByTestId(TOOLBAR_TEST_IDS.brandCluster);
  const controlsCluster = page.getByTestId(TOOLBAR_TEST_IDS.controlsCluster);
  const saveIndicatorWrapper = page.getByTestId(TOOLBAR_TEST_IDS.saveIndicatorWrapper);

  await expectLocatorHasClasses(brandCluster, TOOLBAR_BRAND_CLUSTER_CLASSES);
  await expectLocatorHasClasses(controlsCluster, TOOLBAR_CONTROLS_CLUSTER_CLASSES);
  await expectLocatorHasClasses(saveIndicatorWrapper, TOOLBAR_SAVE_INDICATOR_WRAPPER_CLASSES);
});

Then("the save indicator announces updates politely", async ({ page }) => {
  const indicator = page.getByTestId("save-indicator");
  await expect(indicator).toHaveAttribute("aria-live", "polite");
  await expect(indicator).toHaveAttribute("role", "status");
});

Then("the {string} view mode toggle is marked as active", async ({ page }, label: string) => {
  const toggleId = viewModeIds.get(label.trim().toLowerCase()) ?? null;
  if (!toggleId) {
    throw new Error(`Unknown view mode label: ${label}`);
  }

  const toggle = page.getByTestId(`view-mode-${toggleId}`);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

Given("the stored theme preference is cleared", async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem("kelpie-theme"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

When("I toggle the theme from the toolbar", async ({ page }) => {
  const button = page.getByRole("button", { name: "Switch to dark theme" });
  await expect(button).toBeVisible();
  await button.click();
});

Then("the document theme should be {string}", async ({ page }, theme: string) => {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
});

Then("the theme toggle label reads {string}", async ({ page }, label: string) => {
  await expect(page.getByRole("button", { name: label })).toBeVisible();
});

Then("the panel toggle group is visible within the toolbar", async ({ page }) => {
  const group = page.getByTestId("panel-toggle-group");
  await expect(group).toBeVisible();
});

Then("the panel toggle group is hidden", async ({ page }) => {
  const group = page.getByTestId("panel-toggle-group");
  const count = await group.count();
  if (count === 0) {
    await expect(group).toHaveCount(0);
    return;
  }
  await expect(group).toBeHidden();
});

Then("the panel toggle group is hidden from the DOM", async ({ page }) => {
  await expect(page.getByTestId("panel-toggle-group")).toHaveCount(0);
});
