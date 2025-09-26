/**
 * Types describing the contracts between the app shell and its child panels.
 * These mirror the responsibilities outlined in `specs/app-web-shell.spec.md`.
 */
export const PanelId = {
  Editor: "editor",
  Preview: "preview",
  Settings: "settings"
} as const;

export type PanelId = (typeof PanelId)[keyof typeof PanelId];

export const PANEL_ORDER: readonly PanelId[] = [PanelId.Editor, PanelId.Preview, PanelId.Settings];

/**
 * The layout mode currently selected by the user.
 * - `editor-preview`: editor and preview should be visible (split view on desktop).
 * - `preview-only`: only the preview should be visible.
 * - `settings`: settings replace the main workspace.
 */
export const ViewMode = {
  EditorPreview: "editor-preview",
  PreviewOnly: "preview-only",
  Settings: "settings"
} as const;

export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode];

/**
 * Shell layout state derived from viewport size.
 */
export const ShellLayout = {
  Desktop: "desktop",
  Mobile: "mobile"
} as const;

export type ShellLayout = (typeof ShellLayout)[keyof typeof ShellLayout];

export enum SaveStatusKind {
  Idle = "idle",
  Saving = "saving",
  Saved = "saved",
  Error = "error"
}

export type SaveStatus =
  | { kind: SaveStatusKind.Idle; message: "Saved locally \u2713"; timestamp: number | null }
  | { kind: SaveStatusKind.Saving; message: "Saving locally\u2026"; timestamp: number }
  | { kind: SaveStatusKind.Saved; message: "Saved locally \u2713"; timestamp: number }
  | { kind: SaveStatusKind.Error; message: string; timestamp: number };

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
  if (mode === ViewMode.Settings) return PanelId.Settings;
  if (mode === ViewMode.PreviewOnly) return PanelId.Preview;
  return PanelId.Editor;
}

export function isPanelAllowedInMode(panel: PanelId, mode: ViewMode): boolean {
  if (mode === ViewMode.Settings) {
    return panel === PanelId.Settings;
  }
  if (mode === ViewMode.PreviewOnly) {
    return panel === PanelId.Preview;
  }
  return panel === PanelId.Editor || panel === PanelId.Preview;
}
