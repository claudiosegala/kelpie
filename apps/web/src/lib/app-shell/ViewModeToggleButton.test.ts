import { render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ViewModeToggleButton from "./ViewModeToggleButton.svelte";
import type { ViewMode } from "./contracts";
import { setLayout, setViewMode, shellState } from "$lib/stores/shell";

type ModeExpectation = { id: ViewMode; label: string };

const modes: ModeExpectation[] = [
  { id: "editor-preview", label: "Editor & preview" },
  { id: "preview-only", label: "Preview" },
  { id: "settings", label: "Settings" }
];

describe("ViewModeToggleButton", () => {
  beforeEach(() => {
    setLayout("desktop");
    setViewMode("editor-preview");
  });

  afterEach(() => {
    setLayout("desktop");
    setViewMode("editor-preview");
  });

  it("renders an accessible toggle for each view mode", () => {
    render(ViewModeToggleButton);

    const group = screen.getByRole("group", { name: "Select workspace mode" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(modes.length);
    const state = get(shellState);

    for (const mode of modes) {
      const button = within(group).getByRole("button", { name: mode.label });
      expect(button).toHaveAttribute("aria-pressed", String(state.viewMode === mode.id));
    }
  });

  it("updates the shell state when a different mode is selected", async () => {
    const user = userEvent.setup();
    render(ViewModeToggleButton);

    const previewButton = screen.getByRole("button", { name: "Preview" });

    await user.click(previewButton);
    await tick();

    const state = get(shellState);
    expect(state.viewMode).toBe("preview-only");
    expect(state.activePanel).toBe("preview");
    expect(previewButton).toHaveAttribute("aria-pressed", "true");
  });

  it("reflects external view mode changes", async () => {
    render(ViewModeToggleButton);

    setViewMode("settings");
    await tick();

    const settingsButton = screen.getByRole("button", { name: "Settings" });
    const previewButton = screen.getByRole("button", { name: "Preview" });

    expect(settingsButton).toHaveAttribute("aria-pressed", "true");
    expect(previewButton).toHaveAttribute("aria-pressed", "false");
  });
});
