import { expect, type Locator, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { SaveStatusKind } from "../../src/lib/app-shell/contracts";

const { Given, When, Then } = createBdd();

type SaveStatusUpdate = {
  kind: SaveStatusKind;
  message?: string;
  timestamp?: string | number | null;
};

const SAVE_INDICATOR_TEST_ID = "save-indicator";
const SAVE_INDICATOR_TOOLTIP_TEST_ID = "save-indicator-tooltip";
const SAVE_INDICATOR_LABEL_TEST_ID = "save-indicator-label";
const SAVE_INDICATOR_TIMESTAMP_TEST_ID = "save-indicator-timestamp";

let currentSaveStatusKind: SaveStatusKind = SaveStatusKind.Idle;
let lastTimestampIso: string | null = null;

function indicatorLocator(page: Page) {
  return page.getByTestId(SAVE_INDICATOR_TEST_ID);
}

function badgeLocator(page: Page) {
  return indicatorLocator(page);
}

async function expectClasses(locator: Locator, expectedClasses: readonly string[]): Promise<void> {
  const classList = await locator.getAttribute("class");
  const tokens = new Set(
    (classList ?? "")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
  );

  const missingClasses = expectedClasses.filter((className) => !tokens.has(className));

  expect(missingClasses).toStrictEqual([]);
}

function tooltipLocator(page: Page) {
  return page.getByTestId(SAVE_INDICATOR_TOOLTIP_TEST_ID);
}

function indicatorLabelLocator(page: Page) {
  return indicatorLocator(page).getByTestId(SAVE_INDICATOR_LABEL_TEST_ID);
}

function indicatorTimestampLocator(page: Page) {
  return indicatorLocator(page).getByTestId(SAVE_INDICATOR_TIMESTAMP_TEST_ID);
}

async function loadAppShell(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(indicatorLocator(page)).toBeVisible();
  currentSaveStatusKind = SaveStatusKind.Idle;
  lastTimestampIso = null;
}

async function setSaveStatus(page: Page, update: SaveStatusUpdate): Promise<void> {
  currentSaveStatusKind = update.kind;
  await page.evaluate(
    ([kind, message, timestamp, enums]) => {
      const setter = (globalThis as { __kelpieSetSaveStatus?: (status: unknown) => void }).__kelpieSetSaveStatus;

      if (typeof setter !== "function") {
        throw new Error("setSaveStatusForTesting is not available in persistence store");
      }

      const resolveTimestamp = () => {
        if (timestamp === null) return null;
        if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
          return timestamp;
        }
        if (typeof timestamp === "string") {
          const parsed = Date.parse(timestamp);
          if (!Number.isNaN(parsed)) {
            return parsed;
          }
        }
        return Date.now();
      };

      const baseTimestamp = resolveTimestamp();

      const { Idle, Saving, Saved, Error } = enums as typeof SaveStatusKind;

      if (kind === Saving) {
        setter({ kind: Saving, message: message ?? "Saving locally…", timestamp: baseTimestamp ?? Date.now() });
        return;
      }

      if (kind === Saved) {
        setter({ kind: Saved, message: message ?? "Saved locally ✓", timestamp: baseTimestamp ?? Date.now() });
        return;
      }

      if (kind === Error) {
        setter({ kind: Error, message: message ?? "Failed to save locally", timestamp: baseTimestamp ?? Date.now() });
        return;
      }

      setter({ kind: Idle, message: message ?? "Saved locally ✓", timestamp: baseTimestamp });
    },
    [update.kind, update.message ?? null, update.timestamp ?? null, SaveStatusKind]
  );
}

Given("the app shell begins an offline save", async ({ page }) => {
  await loadAppShell(page);
});

When("the save status is updated to {string}", async ({ page }, kind: string) => {
  await setSaveStatus(page, { kind: kind as SaveStatusKind });
});

Then("the indicator shows {string} with a pulsing badge", async ({ page }, label: string) => {
  const indicator = indicatorLocator(page);
  await expect(indicator).toHaveAttribute("data-kind", currentSaveStatusKind);
  await expect(indicatorLabelLocator(page)).toHaveText(label);
  const badge = badgeLocator(page);
  await expectClasses(badge, ["badge", "animate-pulse"]);
});

Then("it reports the info tone styling", async ({ page }) => {
  const indicator = indicatorLocator(page);
  const badge = badgeLocator(page);

  await expect(indicator).toHaveAttribute("data-kind", SaveStatusKind.Saving);

  await expectClasses(indicator, ["text-info", "border-info/60", "bg-info/10"]);
  await expectClasses(badge, ["border-info/40", "bg-info/20", "text-info/90", "animate-pulse"]);
});

Given(
  "the save status is updated to {string} with timestamp {string}",
  async ({ page }, kind: string, isoTimestamp: string) => {
    await loadAppShell(page);
    lastTimestampIso = isoTimestamp;
    await setSaveStatus(page, { kind: kind as SaveStatusKind, timestamp: isoTimestamp });
  }
);

Then("the indicator shows {string}", async ({ page }, label: string) => {
  const indicator = indicatorLocator(page);
  await expect(indicator).toHaveAttribute("data-kind", currentSaveStatusKind);
  await expect(indicatorLabelLocator(page)).toHaveText(label);
});

Then("it displays the formatted time in parentheses after the label", async ({ page }) => {
  const iso = lastTimestampIso;
  expect(iso).not.toBeNull();

  const expectedTime = await page.evaluate((timestamp) => new Date(timestamp).toLocaleTimeString(), iso);

  await expect(indicatorTimestampLocator(page)).toHaveText(`(${expectedTime})`);
});

Given(
  "the save status is updated to {string} with message {string}",
  async ({ page }, kind: string, message: string) => {
    await loadAppShell(page);
    await setSaveStatus(page, { kind: kind as SaveStatusKind, message });
  }
);

Then("the tooltip explains how to retry or export the data", async ({ page }) => {
  const tooltipMessage =
    "We couldn't save locally. Retry or export your data to keep a copy while we work on cloud sync.";
  const tooltip = tooltipLocator(page);
  await expect(tooltip).toHaveAttribute("data-tip", tooltipMessage);

  const indicator = indicatorLocator(page);
  await expect(indicator).toHaveAttribute("title", tooltipMessage);
});
