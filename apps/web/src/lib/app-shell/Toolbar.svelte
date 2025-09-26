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

  function viewButtonClasses(id: ViewMode): string {
    return [
      "btn btn-sm join-item font-medium transition-colors duration-200",
      $shellState.viewMode === id ? "btn-primary shadow" : "btn-ghost text-base-content/70 hover:text-base-content"
    ].join(" ");
  }

  function panelButtonClasses(id: PanelId): string {
    const isActive = $shellState.activePanel === id;
    return [
      "btn btn-sm join-item font-medium transition-colors duration-200",
      isActive ? "btn-secondary shadow" : "btn-ghost text-base-content/70 hover:text-base-content",
      !isPanelAllowedInMode(id, $shellState.viewMode) ? "btn-disabled opacity-40" : ""
    ]
      .filter(Boolean)
      .join(" ");
  }
</script>

<header class="navbar border-base-300 bg-base-100/95 sticky top-0 z-30 border-b px-4 backdrop-blur">
  <div class="navbar-start flex-col items-start gap-3 py-3 md:flex-row md:items-center">
    <div class="flex items-center gap-3">
      <span class="text-primary text-2xl font-black tracking-tight">Kelpie</span>
      <span class="badge badge-outline badge-sm">{version}</span>
    </div>
    <p class="text-base-content/70 text-sm">Markdown to-do studio — edit, preview, and fine-tune your flow.</p>
  </div>

  <div class="navbar-center flex flex-1 flex-col items-center gap-3 py-3 lg:flex-row lg:justify-center">
    <div class="join join-horizontal" role="group" aria-label="Panel layout">
      {#each viewOptions as option (option.id)}
        <button
          type="button"
          class={`${viewButtonClasses(option.id)} whitespace-nowrap`}
          on:click={() => handleViewChange(option.id)}
        >
          {option.label}
        </button>
      {/each}
    </div>

    {#if $shellState.layout === "mobile"}
      <div class="join join-horizontal" role="group" aria-label="Active panel">
        {#each PANEL_ORDER as panel (panel)}
          <button
            type="button"
            class={`${panelButtonClasses(panel)} whitespace-nowrap`}
            disabled={!isPanelAllowedInMode(panel, $shellState.viewMode)}
            on:click={() => handlePanelChange(panel)}
          >
            {panelLabels[panel]}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="navbar-end py-3">
    <SaveIndicator />
  </div>
</header>
