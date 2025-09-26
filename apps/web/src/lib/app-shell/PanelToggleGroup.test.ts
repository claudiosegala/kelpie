import { render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import PanelToggleGroup from "./PanelToggleGroup.svelte";
import { ShellLayout, PanelId, ViewMode } from "./contracts";
import { PANEL_DEFINITIONS, PANEL_LABELS } from "./panels";
import { activatePanel, setLayout, setViewMode, shellState } from "$lib/stores/shell";

function panelLabel(panel: PanelId): string {
  return PANEL_LABELS[panel];
}

describe("PanelToggleGroup", () => {
  beforeEach(() => {
    setLayout(ShellLayout.Desktop);
    setViewMode(ViewMode.EditorPreview);
    activatePanel(PanelId.Editor);
  });

  afterEach(() => {
    setLayout(ShellLayout.Desktop);
    setViewMode(ViewMode.EditorPreview);
    activatePanel(PanelId.Editor);
  });

  it("does not render anything when the shell is in desktop layout", () => {
    render(PanelToggleGroup);

    expect(screen.queryByRole("group", { name: /Select active panel/i })).not.toBeInTheDocument();
  });

  it("shows an accessible toggle button for each panel when in mobile layout", () => {
    setLayout(ShellLayout.Mobile);

    render(PanelToggleGroup);

    const group = screen.getByRole("group", { name: "Select active panel" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(PANEL_DEFINITIONS.length);

    const state = get(shellState);

    for (const { id } of PANEL_DEFINITIONS) {
      const button = within(group).getByRole("button", { name: panelLabel(id) });
      expect(button).toBeVisible();
      expect(button).toHaveAttribute("aria-pressed", String(state.activePanel === id));
    }
  });

  it("disables panels that are not allowed in the current view mode", () => {
    setLayout(ShellLayout.Mobile);
    setViewMode(ViewMode.Settings);

    render(PanelToggleGroup);

    const editorButton = screen.getByRole("button", { name: panelLabel(PanelId.Editor) });
    const previewButton = screen.getByRole("button", { name: panelLabel(PanelId.Preview) });
    const settingsButton = screen.getByRole("button", { name: panelLabel(PanelId.Settings) });

    expect(editorButton).toBeDisabled();
    expect(previewButton).toBeDisabled();
    expect(settingsButton).not.toBeDisabled();
    expect(settingsButton).toHaveAttribute("aria-pressed", "true");
  });

  it("activates the selected panel when a button is clicked", async () => {
    const user = userEvent.setup();
    setLayout(ShellLayout.Mobile);

    render(PanelToggleGroup);

    const previewButton = screen.getByRole("button", { name: panelLabel(PanelId.Preview) });
    const editorButton = screen.getByRole("button", { name: panelLabel(PanelId.Editor) });

    await user.click(previewButton);
    await tick();

    expect(previewButton).toHaveAttribute("aria-pressed", "true");
    expect(editorButton).toHaveAttribute("aria-pressed", "false");
    expect(get(shellState).activePanel).toBe(PanelId.Preview);
  });
});
