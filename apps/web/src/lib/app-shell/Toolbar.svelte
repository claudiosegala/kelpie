<svelte:options runes={false} />

<script lang="ts">
  import SaveIndicator from "./SaveIndicator.svelte";
  import { PANEL_ORDER, type PanelId, type ViewMode, isPanelAllowedInMode } from "./contracts";
  import { activatePanel, setViewMode, shellState } from "$lib/stores/shell";

  export let version: string;

  const viewOptions: { id: ViewMode; label: string }[] = [
    { id: "editor-preview", label: "Editor + Preview" },
    { id: "preview-only", label: "Preview" },
    { id: "settings", label: "Settings" }
  ];

  const panelLabels: Record<PanelId, string> = {
    editor: "Editor",
    preview: "Preview",
    settings: "Settings"
  };

  function handleViewChange(id: ViewMode) {
    setViewMode(id);
  }

  function handlePanelChange(id: PanelId) {
    activatePanel(id);
  }
</script>

<header class="toolbar">
  <div class="branding">
    <h1>Kelpie</h1>
    <span class="version">{version}</span>
  </div>

  <div class="controls">
    <div class="view-selector" role="group" aria-label="Panel layout">
      {#each viewOptions as option (option.id)}
        <button
          type="button"
          class:active={$shellState.viewMode === option.id}
          on:click={() => handleViewChange(option.id)}
        >
          {option.label}
        </button>
      {/each}
    </div>

    {#if $shellState.layout === "mobile"}
      <div class="panel-selector" role="group" aria-label="Active panel">
        {#each PANEL_ORDER as panel (panel)}
          <button
            type="button"
            class:active={$shellState.activePanel === panel}
            disabled={!isPanelAllowedInMode(panel, $shellState.viewMode)}
            on:click={() => handlePanelChange(panel)}
          >
            {panelLabels[panel]}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="status">
    <SaveIndicator />
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 1rem;
    background: #111827;
    color: #f9fafb;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
  }

  .branding {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  h1 {
    margin: 0;
    font-size: 1.2rem;
    letter-spacing: 0.02em;
  }

  .version {
    font-size: 0.75rem;
    color: rgba(249, 250, 251, 0.75);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-width: 240px;
  }

  .view-selector,
  .panel-selector {
    display: inline-flex;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    padding: 0.25rem;
    gap: 0.25rem;
  }

  button {
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
  }

  button.active {
    background: #2563eb;
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .status {
    margin-left: auto;
    min-width: 160px;
  }

  @media (max-width: 960px) {
    .toolbar {
      align-items: flex-start;
    }

    .status {
      width: 100%;
      margin-left: 0;
    }
  }
</style>
