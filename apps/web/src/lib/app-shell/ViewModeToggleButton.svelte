<svelte:options runes={false} />

<script lang="ts">
  import PreviewIcon from "$lib/components/icons/PreviewIcon.svelte";
  import SettingsIcon from "$lib/components/icons/SettingsIcon.svelte";
  import SplitViewIcon from "$lib/components/icons/SplitViewIcon.svelte";
  import { setViewMode, shellState } from "$lib/stores/shell";
  import type { ViewMode } from "./contracts";
  import { getDockButtonClasses } from "./dockButtonClasses";

  const viewOptions: { id: ViewMode; label: string; Icon: typeof SplitViewIcon }[] = [
    { id: "editor-preview", label: "Editor & preview", Icon: SplitViewIcon },
    { id: "preview-only", label: "Preview", Icon: PreviewIcon },
    { id: "settings", label: "Settings", Icon: SettingsIcon }
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
    <button
      type="button"
      class={getDockButtonClasses({ tone: "primary", isActive })}
      on:click={() => handleViewChange(option.id)}
      aria-pressed={isActive}
      aria-label={option.label}
      title={option.label}
      data-testid={`view-mode-${option.id}`}
    >
      <svelte:component this={option.Icon} className="h-5 w-5" />
    </button>
  {/each}
</div>
