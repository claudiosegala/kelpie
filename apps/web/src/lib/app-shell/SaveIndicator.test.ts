import { render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import SaveIndicator from "./SaveIndicator.svelte";
import { SaveStatusKind } from "$lib/app-shell/contracts";
import { markError, markSaved, markSaving, resetSaveStatus } from "$lib/stores/persistence";

const localTooltip =
  "Changes are stored locally on this device for now. Cloud sync will be introduced in a future release.";
const errorTooltip = "We couldn't save locally. Retry or export your data to keep a copy while we work on cloud sync.";

describe("SaveIndicator", () => {
  afterEach(() => {
    resetSaveStatus();
    vi.useRealTimers();
  });

  it("renders idle state with local save guidance", () => {
    render(SaveIndicator);

    const indicator = screen.getByTestId("save-indicator");
    expect(indicator).toHaveAccessibleName(/Saved locally/);
    expect(indicator).toHaveAttribute("data-kind", SaveStatusKind.Idle);
    expect(indicator).toHaveAttribute("title", localTooltip);
    expect(within(indicator).getByText("Saved locally ✓")).toBeVisible();
    expect(
      screen.queryByText((content) => content.startsWith("(") && content.includes(":") && content.endsWith(")"))
    ).not.toBeInTheDocument();
  });

  it("shows saving state with pulsing badge", async () => {
    render(SaveIndicator);

    markSaving();
    await tick();

    const indicator = screen.getByTestId("save-indicator");
    expect(indicator).toHaveAccessibleName(/Saving locally/);
    expect(indicator).toHaveAttribute("data-kind", SaveStatusKind.Saving);
    expect(indicator).toHaveAttribute("title", localTooltip);
    const label = within(indicator).getByText("Saving locally…");
    expect(label).toBeVisible();
    expect(indicator.className).toContain("animate-pulse");
  });

  it("shows saved timestamp when persistence succeeds", async () => {
    render(SaveIndicator);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T12:00:00Z"));

    markSaved();
    await tick();

    const indicator = screen.getByTestId("save-indicator");
    expect(indicator).toHaveAccessibleName(/Saved locally/);
    expect(indicator).toHaveAttribute("data-kind", SaveStatusKind.Saved);
    const timestamp = within(indicator).getByText(/\(.+:.+\)/);
    expect(timestamp.textContent).toMatch(/^\(.+\)$/);
  });

  it("surfaces errors with retry tooltip", async () => {
    render(SaveIndicator);

    markError(new Error("Disk full"));
    await tick();

    const indicator = screen.getByTestId("save-indicator");
    expect(indicator).toHaveAccessibleName(/Disk full/);
    expect(indicator).toHaveAttribute("data-kind", SaveStatusKind.Error);
    expect(indicator).toHaveAttribute("title", errorTooltip);
    expect(within(indicator).getByText("Disk full")).toBeVisible();
  });
});
