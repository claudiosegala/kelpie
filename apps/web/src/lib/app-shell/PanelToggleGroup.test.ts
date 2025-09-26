import { render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import PanelToggleGroup from "./PanelToggleGroup.svelte";
import { PANEL_ORDER, type PanelId } from "./contracts";
import { activatePanel, setLayout, setViewMode, shellState } from "$lib/stores/shell";

function panelLabel(panel: PanelId): string {
  switch (panel) {
    case "editor":
      return "Editor";
    case "preview":
      return "Preview";
    case "settings":
      return "Settings";
  }
}

describe("PanelToggleGroup", () => {
  beforeEach(() => {
    setLayout("desktop");
    setViewMode("editor-preview");
    activatePanel("editor");
  });

  afterEach(() => {
    setLayout("desktop");
    setViewMode("editor-preview");
    activatePanel("editor");
  });

  it("does not render anything when the shell is in desktop layout", () => {
    render(PanelToggleGroup);

    expect(screen.queryByRole("group", { name: /Select active panel/i })).not.toBeInTheDocument();
  });

  it("shows an accessible toggle button for each panel when in mobile layout", () => {
    setLayout("mobile");

    render(PanelToggleGroup);

    const group = screen.getByRole("group", { name: "Select active panel" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(PANEL_ORDER.length);
    const state = get(shellState);

    for (const panel of PANEL_ORDER) {
      const button = within(group).getByRole("button", { name: panelLabel(panel) });
      expect(button).toBeVisible();
      expect(button).toHaveAttribute("aria-pressed", String(state.activePanel === panel));
    }
  });

  it("disables panels that are not allowed in the current view mode", () => {
    setLayout("mobile");
    setViewMode("settings");

    render(PanelToggleGroup);

    const editorButton = screen.getByRole("button", { name: "Editor" });
    const previewButton = screen.getByRole("button", { name: "Preview" });
    const settingsButton = screen.getByRole("button", { name: "Settings" });

    expect(editorButton).toBeDisabled();
    expect(previewButton).toBeDisabled();
    expect(settingsButton).not.toBeDisabled();
    expect(settingsButton).toHaveAttribute("aria-pressed", "true");
  });

  it("activates the selected panel when a button is clicked", async () => {
    const user = userEvent.setup();
    setLayout("mobile");

    render(PanelToggleGroup);

    const previewButton = screen.getByRole("button", { name: "Preview" });
    const editorButton = screen.getByRole("button", { name: "Editor" });

    await user.click(previewButton);
    await tick();

    expect(previewButton).toHaveAttribute("aria-pressed", "true");
    expect(editorButton).toHaveAttribute("aria-pressed", "false");
    expect(get(shellState).activePanel).toBe("preview");
  });
});
