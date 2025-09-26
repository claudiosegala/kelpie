import EditorIcon from "$lib/components/icons/EditorIcon.svelte";
import PreviewIcon from "$lib/components/icons/PreviewIcon.svelte";
import SettingsIcon from "$lib/components/icons/SettingsIcon.svelte";
import { ViewMode, isPanelAllowedInMode, type PanelId } from "./contracts";

export type PanelDefinition = {
  id: PanelId;
  label: string;
  slot: PanelId;
  icon: typeof EditorIcon;
};

const PANELS_BY_MODE: Record<ViewMode, PanelId[]> = {
  [ViewMode.EditorPreview]: ["editor", "preview"],
  [ViewMode.PreviewOnly]: ["preview"],
  [ViewMode.Settings]: ["settings"]
};

type PanelConfig = { label: string; icon: typeof EditorIcon };

const PANEL_CONFIG: Record<PanelId, PanelConfig> = {
  editor: { label: "Code editor", icon: EditorIcon },
  preview: { label: "Preview", icon: PreviewIcon },
  settings: { label: "Settings", icon: SettingsIcon }
};

const orderedPanels = Array.from(new Set(Object.values(ViewMode).flatMap((mode) => PANELS_BY_MODE[mode]))) as PanelId[];

const definitions = orderedPanels.map((id) => ({
  id,
  label: PANEL_CONFIG[id].label,
  slot: id,
  icon: PANEL_CONFIG[id].icon
})) satisfies PanelDefinition[];

export const PANEL_DEFINITIONS = definitions;

export const PANEL_LABELS: Record<PanelId, string> = Object.fromEntries(
  definitions.map((panel) => [panel.id, panel.label])
) as Record<PanelId, string>;

export function getVisiblePanels(mode: ViewMode): PanelDefinition[] {
  return definitions.filter((panel) => isPanelAllowedInMode(panel.id, mode));
}
