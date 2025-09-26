export { default as AppShell } from "./app-shell/AppShell.svelte";
export { default as Toolbar } from "./app-shell/Toolbar.svelte";
export { default as SaveIndicator } from "./app-shell/SaveIndicator.svelte";
export { default as CodeEditorPanel } from "./panels/editor/CodeEditorPanel.svelte";
export { default as InteractivePreviewPanel } from "./panels/preview/InteractivePreviewPanel.svelte";
export { default as AppSettingsPanel } from "./panels/settings/AppSettingsPanel.svelte";

export { ViewMode } from "./app-shell/contracts";
export type { PanelId, ShellLayout, SaveStatus, SaveStatusKind } from "./app-shell/contracts";
export { shellState, setLayout, setViewMode, activatePanel, startLayoutWatcher } from "./stores/shell";
export { saveStatus } from "./stores/persistence";

export * from "./stores/state";
export * from "./stores/storage";
export { default as favicon } from "./assets/favicon.svg";
