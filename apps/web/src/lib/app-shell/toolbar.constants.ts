export const BRAND_NAME = "Kelpie";
export const BRAND_TAGLINE = "Markdown to-do studio — edit, preview, and fine-tune your flow.";

export enum ToolbarTestId {
  Root = "toolbar",
  BrandCluster = "toolbar-brand-cluster",
  ControlsCluster = "toolbar-controls-cluster",
  SaveIndicatorWrapper = "toolbar-save-indicator-wrapper"
}

export const TOOLBAR_WRAPPER_CLASSES =
  "sticky top-0 z-30 flex w-full flex-wrap items-center justify-between gap-3 border-b border-base-300/70 bg-base-100/95 px-3 py-2 backdrop-blur";

export const TOOLBAR_BRAND_CLUSTER_CLASSES = "flex items-center gap-3";

export const TOOLBAR_CONTROLS_CLUSTER_CLASSES = "flex flex-1 flex-wrap items-center justify-end gap-3 sm:gap-4";

export const TOOLBAR_SAVE_INDICATOR_WRAPPER_CLASSES = "sm:w-auto";

export function buildBrandTooltip(version: string): string {
  const versionLabel = version.trim() || "Unknown";
  return `${BRAND_NAME} ${versionLabel}\n${BRAND_TAGLINE}`;
}
