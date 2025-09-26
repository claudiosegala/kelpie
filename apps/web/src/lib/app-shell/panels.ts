import EditorIcon from "$lib/components/icons/EditorIcon.svelte";
import PreviewIcon from "$lib/components/icons/PreviewIcon.svelte";
import SettingsIcon from "$lib/components/icons/SettingsIcon.svelte";
import { isPanelAllowedInMode, type PanelId, type ViewMode } from "./contracts";

export type PanelDefinition = {
  id: PanelId;
  label: string;
  slot: PanelId;
  icon: typeof EditorIcon;
};

const definitions = [
  {
    id: "editor",
    label: "Code editor",
    slot: "editor",
    icon: EditorIcon
  },
  {
    id: "preview",
    label: "Preview",
    slot: "preview",
    icon: PreviewIcon
  },
  {
    id: "settings",
    label: "Settings",
    slot: "settings",
    icon: SettingsIcon
  }
] satisfies PanelDefinition[];

export const PANEL_DEFINITIONS = definitions;

export const PANEL_LABELS: Record<PanelId, string> = Object.fromEntries(
  definitions.map((panel) => [panel.id, panel.label])
) as Record<PanelId, string>;

export function getVisiblePanels(mode: ViewMode): PanelDefinition[] {
  return definitions.filter((panel) => isPanelAllowedInMode(panel.id, mode));
}
