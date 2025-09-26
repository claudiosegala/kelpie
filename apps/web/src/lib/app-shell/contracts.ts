/**
 * Types describing the contracts between the app shell and its child panels.
 * These mirror the responsibilities outlined in `specs/app-web-shell.spec.md`.
 */
export type PanelId = "editor" | "preview" | "settings";

/**
 * The layout mode currently selected by the user.
 * - `editor-preview`: editor and preview should be visible (split view on desktop).
 * - `preview-only`: only the preview should be visible.
 * - `settings`: settings replace the main workspace.
 */
export enum ViewMode {
  EditorPreview = "editor-preview",
  PreviewOnly = "preview-only",
  Settings = "settings"
}

/**
 * Shell layout state derived from viewport size.
 */
export type ShellLayout = "desktop" | "mobile";

export type SaveStatusKind = "idle" | "saving" | "saved" | "error";

export type SaveStatus =
  | { kind: "idle"; message: "Saved locally \u2713"; timestamp: number | null }
  | { kind: "saving"; message: "Saving locally\u2026"; timestamp: number }
  | { kind: "saved"; message: "Saved locally \u2713"; timestamp: number }
  | { kind: "error"; message: string; timestamp: number };

export type ShellState = {
  layout: ShellLayout;
  viewMode: ViewMode;
  /**
   * Which panel is currently visible on mobile layouts.
   * Desktop layouts ignore this value.
   */
  activePanel: PanelId;
};

export function defaultPanelForMode(mode: ViewMode): PanelId {
  if (mode === ViewMode.Settings) return "settings";
  if (mode === ViewMode.PreviewOnly) return "preview";
  return "editor";
}

export function isPanelAllowedInMode(panel: PanelId, mode: ViewMode): boolean {
  if (mode === ViewMode.Settings) {
    return panel === "settings";
  }
  if (mode === ViewMode.PreviewOnly) {
    return panel === "preview";
  }
  return panel === "editor" || panel === "preview";
}
