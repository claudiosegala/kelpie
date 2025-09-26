export { default as AppShell } from "./app-shell/AppShell.svelte";
export { default as Toolbar } from "./app-shell/Toolbar.svelte";
export { default as SaveIndicator } from "./app-shell/SaveIndicator.svelte";
export { default as CodeEditorPanel } from "./panels/editor/CodeEditorPanel.svelte";
export { default as InteractivePreviewPanel } from "./panels/preview/InteractivePreviewPanel.svelte";
export { default as AppSettingsPanel } from "./panels/settings/AppSettingsPanel.svelte";

export type { PanelId, ViewMode, ShellLayout, SaveStatus, SaveStatusKind } from "./app-shell/contracts";
export { shellState, setLayout, setViewMode, activatePanel, startLayoutWatcher } from "./stores/shell";
export { saveStatus } from "./stores/persistence";

// Only needed for TS to understand SVG imports
declare module "*.svg" {
  const content: string;
  export default content;
}
