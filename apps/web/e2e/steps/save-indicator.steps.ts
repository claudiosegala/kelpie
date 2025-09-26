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
const LOCAL_SAVE_TOOLTIP_MESSAGE =
  "Changes are stored locally on this device for now. Cloud sync will be introduced in a future release.";
const ERROR_TOOLTIP_MESSAGE =
  "We couldn't save locally. Retry or export your data to keep a copy while we work on cloud sync.";

let currentSaveStatusKind: SaveStatusKind = SaveStatusKind.Idle;
let lastTimestampIso: string | null = null;

function parseSaveStatusKind(kind: string): SaveStatusKind {
  const normalized = kind.trim().toLowerCase();
  const values = Object.values(SaveStatusKind) as string[];

  if (!values.includes(normalized)) {
    throw new Error(`Unknown save status kind: ${kind}`);
  }

  return normalized as SaveStatusKind;
}

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

async function expectTooltipMessage(page: Page, message: string): Promise<void> {
  const tooltip = tooltipLocator(page);
  await expect(tooltip).toHaveAttribute("data-tip", message);

  const indicator = indicatorLocator(page);
  await expect(indicator).toHaveAttribute("title", message);
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
  const timestamp = update.timestamp ?? null;
  if (timestamp === null || typeof timestamp === "undefined") {
    lastTimestampIso = null;
  } else if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    lastTimestampIso = new Date(timestamp).toISOString();
  } else if (typeof timestamp === "string") {
    const parsed = Date.parse(timestamp);
    lastTimestampIso = Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  } else {
    lastTimestampIso = null;
  }
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

Given("the user has the app shell open", async ({ page }) => {
  await loadAppShell(page);
});

Given("the save status store reports {string}", async ({ page }, kind: string) => {
  await setSaveStatus(page, { kind: parseSaveStatusKind(kind) });
});

Given("the save status store reports {string} with a recent timestamp", async ({ page }, kind: string) => {
  const isoTimestamp = new Date().toISOString();
  await setSaveStatus(page, { kind: parseSaveStatusKind(kind), timestamp: isoTimestamp });
});

Then("the badge tone is styled for success", async ({ page }) => {
  const indicator = indicatorLocator(page);
  await expect(indicator).toHaveAttribute("data-kind", currentSaveStatusKind);
  await expectClasses(indicator, ["indicator", "border-success/40", "bg-success/10", "text-success"]);
});

Then("the tooltip explains that changes are stored locally for now", async ({ page }) => {
  await expectTooltipMessage(page, LOCAL_SAVE_TOOLTIP_MESSAGE);
});

Then("the badge pulses to indicate activity", async ({ page }) => {
  const indicator = indicatorLocator(page);
  await expect(indicator).toHaveAttribute("data-kind", SaveStatusKind.Saving);
  await expectClasses(indicator, [
    "indicator",
    "border-info/40",
    "bg-info/10",
    "text-info",
    "indicator--saving",
    "animate-pulse"
  ]);
});

Then("the tooltip still describes local storage", async ({ page }) => {
  await expectTooltipMessage(page, LOCAL_SAVE_TOOLTIP_MESSAGE);
});

Then("the timestamp is displayed in parentheses with the local time", async ({ page }) => {
  const iso = lastTimestampIso;
  expect(iso).not.toBeNull();

  const expectedTime = await page.evaluate((timestamp) => new Date(timestamp).toLocaleTimeString(), iso);
  await expect(indicatorTimestampLocator(page)).toHaveText(`(${expectedTime})`);
});

Then("the tooltip includes the last saved time on a new line", async ({ page }) => {
  const iso = lastTimestampIso;
  expect(iso).not.toBeNull();

  const formattedTime = await page.evaluate((timestamp) => new Date(timestamp).toLocaleTimeString(), iso);
  const expectedMessage = `${LOCAL_SAVE_TOOLTIP_MESSAGE}\nLast saved at ${formattedTime}.`;
  await expectTooltipMessage(page, expectedMessage);
});

Then("the badge tone switches to error styling", async ({ page }) => {
  const indicator = indicatorLocator(page);
  await expect(indicator).toHaveAttribute("data-kind", SaveStatusKind.Error);
  await expectClasses(indicator, ["indicator", "border-error/40", "bg-error/10", "text-error"]);
});

Then("the tooltip advises retrying or exporting data", async ({ page }) => {
  await expectTooltipMessage(page, ERROR_TOOLTIP_MESSAGE);
});

Given("the app shell begins an offline save", async ({ page }) => {
  await loadAppShell(page);
});

When("the save status is updated to {string}", async ({ page }, kind: string) => {
  await setSaveStatus(page, { kind: parseSaveStatusKind(kind) });
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
    await setSaveStatus(page, { kind: parseSaveStatusKind(kind), timestamp: isoTimestamp });
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
    await setSaveStatus(page, { kind: parseSaveStatusKind(kind), message });
  }
);

Then("the tooltip explains how to retry or export the data", async ({ page }) => {
  await expectTooltipMessage(page, ERROR_TOOLTIP_MESSAGE);
});
