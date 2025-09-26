<svelte:options runes={false} />

<script lang="ts">
  import SaveIndicator from "./SaveIndicator.svelte";
  import { PANEL_ORDER, type PanelId, type ViewMode, isPanelAllowedInMode } from "./contracts";
  import { activatePanel, setViewMode, shellState } from "$lib/stores/shell";
  import { theme, toggleTheme } from "$lib/stores/theme";

  export let version: string;

  const viewOptions: { id: ViewMode; label: string }[] = [
    { id: "editor-preview", label: "Editor & preview" },
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
    const isActive = $shellState.viewMode === id;
    return [
      "dock-item btn btn-sm btn-circle border border-transparent bg-transparent text-base-content/70 transition-all duration-200",
      isActive
        ? "btn-primary text-primary-content shadow-sm"
        : "hover:border-base-300 hover:bg-base-200/60 hover:text-base-content"
    ].join(" ");
  }

  function panelButtonClasses(id: PanelId): string {
    const isActive = $shellState.activePanel === id;
    const disabled = !isPanelAllowedInMode(id, $shellState.viewMode);
    return [
      "dock-item btn btn-xs sm:btn-sm btn-circle border border-transparent bg-transparent text-base-content/70 transition-all duration-200",
      isActive
        ? "btn-secondary text-secondary-content shadow-sm"
        : "hover:border-base-300 hover:bg-base-200/60 hover:text-base-content",
      disabled ? "btn-disabled opacity-40" : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  function nextThemeLabel(): string {
    return $theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  }
</script>

<header class="navbar sticky top-0 z-30 border-b border-base-300/70 bg-base-100/95 px-4 backdrop-blur">
  <div class="navbar-start flex items-center gap-3 py-3">
    <div class="min-w-[10rem] sm:w-auto">
      <SaveIndicator />
    </div>
    <button
      type="button"
      class="btn btn-circle btn-sm border border-base-300/60 bg-base-100/80 text-base-content shadow-sm hover:border-primary/40"
      on:click={toggleTheme}
      aria-label={nextThemeLabel()}
      title={nextThemeLabel()}
    >
      {#if $theme === "light"}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4">
          <circle cx="12" cy="12" r="4" stroke-width="1.5" />
          <path
            stroke-width="1.5"
            d="M12 2.75v2.5m0 13.5v2.5M4.75 12h-2.5m19.5 0h-2.5M6.3 6.3l-1.77-1.77m14.94 14.94-1.77-1.77m0-11.4 1.77-1.77M6.3 17.7l-1.77 1.77"
          />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4">
          <path stroke-width="1.5" d="M19.28 15.56A8 8 0 0 1 8.44 4.72 7.25 7.25 0 1 0 19.28 15.56Z" />
        </svg>
      {/if}
    </button>
  </div>

  <div class="navbar-center flex flex-1 items-center justify-center py-3">
    <div
      class="tooltip tooltip-bottom"
      data-tip={`Kelpie ${version}\nMarkdown to-do studio — edit, preview, and fine-tune your flow.`}
    >
      <span class="text-xl font-black tracking-tight text-primary sm:text-2xl">Kelpie</span>
    </div>
  </div>

  <div class="navbar-end flex items-center gap-3 py-3">
    <div
      class="dock items-center gap-1 rounded-full border border-base-300/70 bg-base-100/70 px-1 py-1 shadow-sm"
      role="group"
      aria-label="Select workspace mode"
    >
      {#each viewOptions as option (option.id)}
        <button
          type="button"
          class={viewButtonClasses(option.id)}
          on:click={() => handleViewChange(option.id)}
          aria-pressed={$shellState.viewMode === option.id}
          aria-label={option.label}
          title={option.label}
        >
          {#if option.id === "editor-preview"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="h-4 w-4"
            >
              <rect x="3.5" y="5.5" width="7" height="13" rx="1.5" stroke-width="1.5" />
              <rect x="13.5" y="5.5" width="7" height="13" rx="1.5" stroke-width="1.5" />
            </svg>
          {:else if option.id === "preview-only"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="h-4 w-4"
            >
              <path stroke-width="1.5" d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12Z" />
              <circle cx="12" cy="12" r="2.5" stroke-width="1.5" />
            </svg>
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="h-4 w-4"
            >
              <circle cx="12" cy="12" r="3" stroke-width="1.5" />
              <path stroke-width="1.5" d="M4.5 12a7.5 7.5 0 0 1 1.53-4.53L3 4.5l2.5-2.5 3 3A7.5 7.5 0 0 1 12 4.5" />
              <path
                stroke-width="1.5"
                d="M19.5 12a7.5 7.5 0 0 1-1.53 4.53l3.03 3.03-2.5 2.5-3.03-3.03A7.5 7.5 0 0 1 12 19.5"
              />
            </svg>
          {/if}
        </button>
      {/each}
    </div>

    {#if $shellState.layout === "mobile"}
      <div
        class="dock items-center gap-1 rounded-full border border-base-300/70 bg-base-100/70 px-1 py-1 shadow-sm"
        role="group"
        aria-label="Select active panel"
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
          >
            {#if panel === "editor"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="h-3.5 w-3.5"
              >
                <path stroke-width="1.5" d="m4.5 15.5 6-6 3 3 6-6" />
                <path stroke-width="1.5" d="M14.5 5.5h5v5" />
              </svg>
            {:else if panel === "preview"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="h-3.5 w-3.5"
              >
                <path stroke-width="1.5" d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12Z" />
                <circle cx="12" cy="12" r="2.5" stroke-width="1.5" />
              </svg>
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="h-3.5 w-3.5"
              >
                <circle cx="12" cy="12" r="3" stroke-width="1.5" />
                <path
                  stroke-width="1.5"
                  d="M19.5 12a7.5 7.5 0 0 1-1.53 4.53l3.03 3.03-2.5 2.5-3.03-3.03A7.5 7.5 0 0 1 12 19.5"
                />
                <path
                  stroke-width="1.5"
                  d="M4.5 12a7.5 7.5 0 0 1 1.53-4.53L3 4.5l2.5-2.5 3.03 3.03A7.5 7.5 0 0 1 12 4.5"
                />
              </svg>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</header>
