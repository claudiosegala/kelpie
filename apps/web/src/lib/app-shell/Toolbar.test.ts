import { render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import Toolbar from "./Toolbar.svelte";
import { PANEL_DEFINITIONS } from "./panels";
import { PanelId, ShellLayout, ViewMode } from "./contracts";
import { activatePanel, setLayout, setViewMode } from "$lib/stores/shell";
import { resetSaveStatus } from "$lib/stores/persistence";
import {
  TOOLBAR_BRAND_CLUSTER_CLASSES,
  TOOLBAR_CONTROLS_CLUSTER_CLASSES,
  TOOLBAR_SAVE_INDICATOR_WRAPPER_CLASSES,
  TOOLBAR_TEST_IDS,
  TOOLBAR_WRAPPER_CLASSES
} from "./toolbar.constants";

describe("Toolbar", () => {
  function resetShellState() {
    setLayout(ShellLayout.Desktop);
    setViewMode(ViewMode.EditorPreview);
    activatePanel(PanelId.Editor);
    resetSaveStatus();
  }

  function renderToolbar(version = "1.2.3") {
    return render(Toolbar, { version });
  }

  function expectElementHasClasses(element: HTMLElement, classes: string) {
    for (const className of classes.split(/\s+/).filter(Boolean)) {
      expect(element).toHaveClass(className);
    }
  }

  beforeEach(() => {
    resetShellState();
  });

  afterEach(() => {
    resetShellState();
  });

  it("renders a branded tooltip that includes the app version", () => {
    const version = "1.2.3";

    renderToolbar(version);

    const tooltip = screen.getByTestId("toolbar-brand-tooltip");
    expect(tooltip).toHaveAttribute("data-tip", expect.stringContaining(version));
    expect(screen.getByTestId("toolbar-brand-label")).toHaveTextContent("Kelpie");
  });

  it("applies exported layout classes and test ids to clusters", () => {
    renderToolbar("2.0.0");

    const root = screen.getByTestId(TOOLBAR_TEST_IDS.root);
    expectElementHasClasses(root as HTMLElement, TOOLBAR_WRAPPER_CLASSES);

    const brandCluster = screen.getByTestId(TOOLBAR_TEST_IDS.brandCluster);
    expectElementHasClasses(brandCluster as HTMLElement, TOOLBAR_BRAND_CLUSTER_CLASSES);

    const controlsCluster = screen.getByTestId(TOOLBAR_TEST_IDS.controlsCluster);
    expectElementHasClasses(controlsCluster as HTMLElement, TOOLBAR_CONTROLS_CLUSTER_CLASSES);

    const saveIndicatorWrapper = screen.getByTestId(TOOLBAR_TEST_IDS.saveIndicatorWrapper);
    expectElementHasClasses(saveIndicatorWrapper as HTMLElement, TOOLBAR_SAVE_INDICATOR_WRAPPER_CLASSES);
  });

  it("exposes panel toggles, save status, view mode controls, and theme switcher", () => {
    setLayout(ShellLayout.Mobile);

    renderToolbar("2.0.0");

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

  it("only renders panel toggles when the shell layout is mobile", async () => {
    renderToolbar("3.0.0");

    expect(screen.queryByTestId("panel-toggle-group")).not.toBeInTheDocument();

    setLayout(ShellLayout.Mobile);
    expect(await screen.findByTestId("panel-toggle-group")).toBeVisible();

    setLayout(ShellLayout.Desktop);
    await waitFor(() => {
      expect(screen.queryByTestId("panel-toggle-group")).not.toBeInTheDocument();
    });
  });
});
