import { afterEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { activatePanel, setLayout, setViewMode, shellState } from "./shell";
import { PanelId, ShellLayout, ViewMode, defaultPanelForMode } from "$lib/app-shell/contracts";

describe("shell store", () => {
  afterEach(() => {
    setLayout(ShellLayout.Desktop);
    setViewMode(ViewMode.EditorPreview);
  });

  it("provides default panel for each mode", () => {
    expect(defaultPanelForMode(ViewMode.EditorPreview)).toBe(PanelId.Editor);
    expect(defaultPanelForMode(ViewMode.PreviewOnly)).toBe(PanelId.Preview);
    expect(defaultPanelForMode(ViewMode.Settings)).toBe(PanelId.Settings);
  });

  it("switches to preview-only mode and updates active panel on mobile", () => {
    setLayout(ShellLayout.Mobile);
    setViewMode(ViewMode.PreviewOnly);

    const state = get(shellState);
    expect(state.viewMode).toBe(ViewMode.PreviewOnly);
    expect(state.activePanel).toBe(PanelId.Preview);
  });

  it("ignores invalid panel activation in current mode", () => {
    setViewMode(ViewMode.EditorPreview);
    setLayout(ShellLayout.Mobile);
    activatePanel(PanelId.Settings);

    const state = get(shellState);
    expect(state.activePanel).toBe(PanelId.Editor);
  });
});
