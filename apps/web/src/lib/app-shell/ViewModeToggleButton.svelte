<svelte:options runes={false} />

<script lang="ts">
  import PreviewIcon from "$lib/components/icons/PreviewIcon.svelte";
  import SettingsIcon from "$lib/components/icons/SettingsIcon.svelte";
  import SplitViewIcon from "$lib/components/icons/SplitViewIcon.svelte";
  import { setViewMode, shellState } from "$lib/stores/shell";
  import type { ViewMode } from "./contracts";
  import DockToggleButton from "./DockToggleButton.svelte";
  import { ViewMode } from "./contracts";
  import { getDockButtonClasses } from "./dockButtonClasses";

  const viewOptions: { id: ViewMode; label: string; Icon: typeof SplitViewIcon }[] = [
    { id: ViewMode.EditorPreview, label: "Editor & preview", Icon: SplitViewIcon },
    { id: ViewMode.PreviewOnly, label: "Preview", Icon: PreviewIcon },
    { id: ViewMode.Settings, label: "Settings", Icon: SettingsIcon }
  ];

  function handleViewChange(id: ViewMode) {
    setViewMode(id);
  }
</script>

<div
  class="dock flex flex-row items-center gap-2 rounded-full border border-base-300/70 bg-base-100/70 px-2 py-1.5 shadow-sm"
  role="group"
  aria-label="Select workspace mode"
>
  {#each viewOptions as option (option.id)}
    {@const isActive = $shellState.viewMode === option.id}
    <DockToggleButton
      id={option.id}
      label={option.label}
      tone="primary"
      {isActive}
      on:select={(event) => handleViewChange(event.detail as ViewMode)}
      data-testid={`view-mode-${option.id}`}
    >
      <svelte:component this={option.Icon} className="h-5 w-5" />
    </DockToggleButton>
  {/each}
</div>
