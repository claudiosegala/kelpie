<svelte:options runes={false} />

<script lang="ts">
  import { activatePanel, shellState } from "$lib/stores/shell";
  import { type PanelId, isPanelAllowedInMode } from "./contracts";
  import { getDockButtonClasses, type DockButtonTone } from "./dockButtonClasses";
  import { PANEL_DEFINITIONS } from "./panels";

  const panelOptions = PANEL_DEFINITIONS.map((panel) => ({
    id: panel.id,
    label: panel.label,
    Icon: panel.icon
  }));

  function handlePanelChange(id: PanelId) {
    activatePanel(id);
  }

  const panelTone: DockButtonTone = "secondary";
</script>

{#if $shellState.layout === "mobile"}
  <div
    class="dock flex flex-row items-center gap-2 rounded-full border border-base-300/70 bg-base-100/70 px-2 py-1.5 shadow-sm"
    role="group"
    aria-label="Select active panel"
    data-testid="panel-toggle-group"
  >
    {#each panelOptions as { id, label, Icon } (id)}
      {@const isActive = $shellState.activePanel === id}
      {@const isAllowed = isPanelAllowedInMode(id, $shellState.viewMode)}
      {@const buttonClasses = getDockButtonClasses({
        tone: panelTone,
        isActive,
        disabled: !isAllowed
      })}
      <button
        type="button"
        class={buttonClasses}
        disabled={!isAllowed}
        on:click={() => handlePanelChange(id)}
        aria-label={label}
        title={label}
        aria-pressed={isActive}
        data-testid={`panel-toggle-${id}`}
      >
        <svelte:component this={Icon} className="h-4 w-4" />
      </button>
    {/each}
  </div>
{/if}
