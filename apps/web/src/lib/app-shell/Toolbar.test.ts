import { render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import Toolbar from "./Toolbar.svelte";
import { PANEL_DEFINITIONS } from "./panels";
import { ViewMode } from "./contracts";
import { activatePanel, setLayout, setViewMode } from "$lib/stores/shell";
import { resetSaveStatus } from "$lib/stores/persistence";

describe("Toolbar", () => {
  beforeEach(() => {
    setLayout("desktop");
    setViewMode(ViewMode.EditorPreview);
    activatePanel("editor");
    resetSaveStatus();
  });

  afterEach(() => {
    setLayout("desktop");
    setViewMode(ViewMode.EditorPreview);
    activatePanel("editor");
    resetSaveStatus();
  });

  it("renders a branded tooltip that includes the app version", () => {
    const version = "1.2.3";

    render(Toolbar, { version });

    const tooltip = screen.getByTestId("toolbar-brand-tooltip");
    expect(tooltip).toHaveAttribute("data-tip", expect.stringContaining(version));
    expect(screen.getByTestId("toolbar-brand-label")).toHaveTextContent("Kelpie");
  });

  it("exposes panel toggles, save status, view mode controls, and theme switcher", () => {
    setLayout("mobile");

    render(Toolbar, { version: "2.0.0" });

    const panelGroup = screen.getByTestId("panel-toggle-group");
    expect(panelGroup).toBeVisible();
    for (const panel of PANEL_DEFINITIONS) {
      expect(screen.getByTestId(`panel-toggle-${panel.id}`)).toBeInTheDocument();
    }

    expect(screen.getByTestId("save-indicator")).toBeVisible();

    const viewModeGroup = screen.getByRole("group", { name: "Select workspace mode" });
    expect(viewModeGroup).toBeVisible();
    for (const mode of Object.values(ViewMode)) {
      expect(screen.getByTestId(`view-mode-${mode}`)).toBeInTheDocument();
    }

    expect(screen.getByRole("button", { name: /Switch to (dark|light) theme/i })).toBeVisible();
  });
});
