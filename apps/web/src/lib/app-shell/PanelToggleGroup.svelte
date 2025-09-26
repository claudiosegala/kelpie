<svelte:options runes={false} />

<script lang="ts">
  import { activatePanel, shellState } from "$lib/stores/shell";
  import { ShellLayout, isPanelAllowedInMode } from "./contracts";
  import type { PanelId } from "./contracts";
  import DockToggleButton from "./DockToggleButton.svelte";
  import type { DockButtonTone } from "./dockButtonClasses";
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

{#if $shellState.layout === ShellLayout.Mobile}
  <div
    class="dock flex flex-row items-center gap-2 rounded-full border border-base-300/70 bg-base-100/70 px-2 py-1.5 shadow-sm"
    role="group"
    aria-label="Select active panel"
    data-testid="panel-toggle-group"
  >
    {#each panelOptions as { id, label, Icon } (id)}
      {@const isActive = $shellState.activePanel === id}
      {@const isAllowed = isPanelAllowedInMode(id, $shellState.viewMode)}
      <DockToggleButton
        {id}
        {label}
        tone={panelTone}
        {isActive}
        isDisabled={!isAllowed}
        on:select={(event) => handlePanelChange(event.detail as PanelId)}
        data-testid={`panel-toggle-${id}`}
      >
        <svelte:component this={Icon} className="h-4 w-4" />
      </DockToggleButton>
    {/each}
  </div>
{/if}
