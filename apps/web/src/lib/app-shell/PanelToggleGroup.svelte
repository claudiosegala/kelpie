<svelte:options runes={false} />

<script lang="ts">
  import { PANEL_ORDER, type PanelId, isPanelAllowedInMode } from "./contracts";
  import { activatePanel, shellState } from "$lib/stores/shell";

  const panelLabels: Record<PanelId, string> = {
    editor: "Editor",
    preview: "Preview",
    settings: "Settings"
  };

  function handlePanelChange(id: PanelId) {
    activatePanel(id);
  }

  function panelButtonClasses(id: PanelId): string {
    const isActive = $shellState.activePanel === id;
    const disabled = !isPanelAllowedInMode(id, $shellState.viewMode);

    return [
      "dock-item btn btn-sm sm:btn-md btn-circle border border-transparent bg-base-100/70 text-base-content/80 shadow-none transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary/70",
      isActive
        ? "bg-secondary text-secondary-content shadow-lg shadow-secondary/30 ring-2 ring-secondary/70"
        : "hover:border-base-300 hover:bg-base-200/70 hover:text-base-content",
      disabled ? "btn-disabled opacity-40" : ""
    ]
      .filter(Boolean)
      .join(" ");
  }
</script>

{#if $shellState.layout === "mobile"}
  <div
    class="dock flex flex-row items-center gap-2 rounded-full border border-base-300/70 bg-base-100/70 px-2 py-1.5 shadow-sm"
    role="group"
    aria-label="Select active panel"
    data-testid="panel-toggle-group"
  >
    {#each PANEL_ORDER as panel (panel)}
      <button
        type="button"
        class={panelButtonClasses(panel)}
        disabled={!isPanelAllowedInMode(panel, $shellState.viewMode)}
        on:click={() => handlePanelChange(panel)}
        aria-label={panelLabels[panel]}
        title={panelLabels[panel]}
        aria-pressed={$shellState.activePanel === panel}
        data-testid={`panel-toggle-${panel}`}
      >
        {#if panel === "editor"}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4">
            <path stroke-width="1.5" d="m4.5 15.5 6-6 3 3 6-6" />
            <path stroke-width="1.5" d="M14.5 5.5h5v5" />
          </svg>
        {:else if panel === "preview"}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4">
            <path stroke-width="1.5" d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12Z" />
            <circle cx="12" cy="12" r="2.5" stroke-width="1.5" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4">
            <path
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.89 3.31.877 2.42 2.42a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.89 1.543-.877 3.31-2.42 2.42a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.89-3.31-.877-2.42-2.42a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35A1.724 1.724 0 0 0 4.68 7.803c-.89-1.543.877-3.31 2.42-2.42a1.724 1.724 0 0 0 2.572-1.066Z"
            />
            <path
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        {/if}
      </button>
    {/each}
  </div>
{/if}
