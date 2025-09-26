import { afterEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { activatePanel, setLayout, setViewMode, shellState } from "./shell";
import { ViewMode, defaultPanelForMode } from "$lib/app-shell/contracts";

describe("shell store", () => {
  afterEach(() => {
    setLayout("desktop");
    setViewMode(ViewMode.EditorPreview);
  });

  it("provides default panel for each mode", () => {
    expect(defaultPanelForMode(ViewMode.EditorPreview)).toBe("editor");
    expect(defaultPanelForMode(ViewMode.PreviewOnly)).toBe("preview");
    expect(defaultPanelForMode(ViewMode.Settings)).toBe("settings");
  });

  it("switches to preview-only mode and updates active panel on mobile", () => {
    setLayout("mobile");
    setViewMode(ViewMode.PreviewOnly);

    const state = get(shellState);
    expect(state.viewMode).toBe(ViewMode.PreviewOnly);
    expect(state.activePanel).toBe("preview");
  });

  it("ignores invalid panel activation in current mode", () => {
    setViewMode(ViewMode.EditorPreview);
    setLayout("mobile");
    activatePanel("settings");

    const state = get(shellState);
    expect(state.activePanel).toBe("editor");
  });
});
