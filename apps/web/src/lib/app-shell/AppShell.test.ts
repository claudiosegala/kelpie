import { render, screen } from "@testing-library/svelte";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import AppShell from "./AppShell.svelte";
import { PANEL_DEFINITIONS, getVisiblePanels } from "./panels";
import { PanelId, ShellLayout, ViewMode, isPanelAllowedInMode } from "./contracts";
import { activatePanel, setLayout, setViewMode } from "$lib/stores/shell";

type RenderShellOptions = {
  layout?: ShellLayout;
  viewMode?: ViewMode;
  activePanel?: PanelId;
};

type MatchMediaStub = ReturnType<typeof createMatchMediaStub>;

function createMatchMediaStub(matchesRef: { value: boolean }) {
  return (query: string): MediaQueryList => ({
    matches: matchesRef.value,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false)
  });
}

describe("AppShell", () => {
  const matchMediaState = { value: false };
  let matchMedia: MatchMediaStub;

  beforeAll(() => {
    matchMedia = createMatchMediaStub(matchMediaState);
    vi.stubGlobal("matchMedia", matchMedia);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

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

  function renderShell({
    layout = ShellLayout.Desktop,
    viewMode = ViewMode.EditorPreview,
    activePanel
  }: RenderShellOptions = {}) {
    matchMediaState.value = layout === ShellLayout.Mobile;
    setLayout(layout);
    setViewMode(viewMode);
    if (activePanel) {
      activatePanel(activePanel);
    }

    return render(AppShell, {
      props: { version: "1.0.0" }
    });
  }

  it("syncs the rendered panel regions with the active layout state on desktop", () => {
    renderShell({ layout: ShellLayout.Desktop, viewMode: ViewMode.EditorPreview });

    const visiblePanels = getVisiblePanels(ViewMode.EditorPreview);

    for (const panel of visiblePanels) {
      const region = screen.getByTestId(`panel-${panel.id}`);
      expect(region).toHaveAttribute("data-panel", panel.id);
      expect(region).toHaveAttribute("aria-label", panel.label);
      expect(region).toHaveAttribute("data-allowed", "true");
      expect(region).toHaveAttribute("data-active", "true");
      expect(region).not.toHaveAttribute("hidden");
    }

    const hiddenPanels = PANEL_DEFINITIONS.filter((panel) => !isPanelAllowedInMode(panel.id, ViewMode.EditorPreview));
    for (const panel of hiddenPanels) {
      expect(screen.queryByTestId(`panel-${panel.id}`)).not.toBeInTheDocument();
    }
  });

  it("hides inactive panels on mobile layouts while keeping accessible metadata", () => {
    renderShell({ layout: ShellLayout.Mobile, viewMode: ViewMode.EditorPreview, activePanel: PanelId.Preview });

    const editorPanel = screen.getByTestId("panel-editor");
    expect(editorPanel).toHaveAttribute("data-active", "false");
    expect(editorPanel).toHaveAttribute("data-allowed", "true");
    expect(editorPanel).toHaveAttribute("hidden");

    const previewPanel = screen.getByTestId("panel-preview");
    expect(previewPanel).toHaveAttribute("data-active", "true");
    expect(previewPanel).toHaveAttribute("data-allowed", "true");
    expect(previewPanel).not.toHaveAttribute("hidden");
  });

  it("only renders panels that are allowed in the current view mode", () => {
    renderShell({ layout: ShellLayout.Desktop, viewMode: ViewMode.Settings });

    const visiblePanels = getVisiblePanels(ViewMode.Settings);
    for (const panel of visiblePanels) {
      expect(screen.getByTestId(`panel-${panel.id}`)).toBeInTheDocument();
    }

    const disallowedPanels = PANEL_DEFINITIONS.filter((panel) => !isPanelAllowedInMode(panel.id, ViewMode.Settings));
    for (const panel of disallowedPanels) {
      expect(screen.queryByTestId(`panel-${panel.id}`)).not.toBeInTheDocument();
    }
  });
});
