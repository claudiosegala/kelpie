import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Toolbar from "./Toolbar.svelte";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  TOOLBAR_BRAND_CLUSTER_CLASSES,
  TOOLBAR_CONTROLS_CLUSTER_CLASSES,
  TOOLBAR_SAVE_INDICATOR_WRAPPER_CLASSES,
  TOOLBAR_TEST_IDS,
  TOOLBAR_WRAPPER_CLASSES,
  buildBrandTooltip
} from "./toolbar.constants";

function expectElementToHaveClasses(element: HTMLElement, classes: string): void {
  expect(element).toHaveClass(...classes.split(" "));
}

describe("Toolbar", () => {
  it("renders the toolbar layout with stable clusters and controls", () => {
    render(Toolbar, { version: "0.0.0-dev" });

    const toolbar = screen.getByTestId(TOOLBAR_TEST_IDS.root);
    expect(toolbar).toBeVisible();
    expectElementToHaveClasses(toolbar, TOOLBAR_WRAPPER_CLASSES);

    const brandCluster = screen.getByTestId(TOOLBAR_TEST_IDS.brandCluster);
    expectElementToHaveClasses(brandCluster, TOOLBAR_BRAND_CLUSTER_CLASSES);
    const brandLabel = within(brandCluster).getByTestId("toolbar-brand-label");
    expect(brandLabel).toHaveTextContent(BRAND_NAME);

    const controlsCluster = screen.getByTestId(TOOLBAR_TEST_IDS.controlsCluster);
    expectElementToHaveClasses(controlsCluster, TOOLBAR_CONTROLS_CLUSTER_CLASSES);

    const saveIndicatorWrapper = screen.getByTestId(TOOLBAR_TEST_IDS.saveIndicatorWrapper);
    expectElementToHaveClasses(saveIndicatorWrapper, TOOLBAR_SAVE_INDICATOR_WRAPPER_CLASSES);
    expect(saveIndicatorWrapper).toContainElement(screen.getByTestId("save-indicator"));

    expect(screen.getByRole("group", { name: "Select workspace mode" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
    expect(screen.queryByTestId("panel-toggle-group")).not.toBeInTheDocument();
  });

  it("builds the brand tooltip from a trimmed version string", () => {
    render(Toolbar, { version: "  1.2.3 " });

    const tooltip = screen.getByTestId("toolbar-brand-tooltip");
    expect(tooltip).toHaveAttribute("title", buildBrandTooltip("1.2.3"));
    expect(tooltip).toHaveAttribute("data-tip", buildBrandTooltip("1.2.3"));
    expect(within(tooltip).getByText(BRAND_NAME)).toBeVisible();
    expect(buildBrandTooltip("   ")).toBe(`${BRAND_NAME} Unknown\n${BRAND_TAGLINE}`);
  });
});
