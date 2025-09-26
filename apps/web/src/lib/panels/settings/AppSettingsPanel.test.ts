import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

import AppSettingsPanel, { type ShellSettings } from "./AppSettingsPanel.svelte";

describe("AppSettingsPanel", () => {
  it("renders the panel heading and description copy", () => {
    render(AppSettingsPanel);

    expect(screen.getByRole("heading", { name: "App Settings" })).toBeVisible();
    expect(screen.getByText("Future work: connect these controls to the live workspace shell.")).toBeVisible();
  });

  it("shows the debounce select as disabled with the provided settings value", () => {
    const settings: ShellSettings = { debounceMs: 500 };

    render(AppSettingsPanel, { settings });

    const select = screen.getByLabelText("Preview debounce");
    expect(select).toBeDisabled();
    expect(select).toHaveValue("500");
    expect(screen.getByRole("option", { name: "500ms" })).toBeVisible();
  });

  it("explains that the preview controls are placeholders", () => {
    render(AppSettingsPanel);

    expect(screen.getByText("Hook up to preview pipeline in a follow-up task.")).toBeVisible();
  });

  it("renders the storage inspector tooling", () => {
    render(AppSettingsPanel);

    expect(screen.getByRole("heading", { name: "Storage Inspector" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reset storage" })).toBeVisible();
  });
});
