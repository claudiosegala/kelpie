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
      "dock-item btn btn-sm sm:btn-md btn-circle border border-transparent bg-base-100/70 text-base-content/80 shadow-none transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70",
      isActive
        ? "bg-primary text-primary-content shadow-lg shadow-primary/30 ring-2 ring-primary/70"
        : "hover:border-base-300 hover:bg-base-200/70 hover:text-base-content"
    ].join(" ");
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

  function nextThemeLabel(): string {
    return $theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  }
</script>

<header
  class="sticky top-0 z-30 flex w-full flex-wrap items-center justify-between gap-3 border-b border-base-300/70 bg-base-100/95 px-3 py-2 backdrop-blur"
>
  <div class="flex items-center gap-3">
    <div
      class="tooltip tooltip-bottom"
      data-tip={`Kelpie ${version}\nMarkdown to-do studio — edit, preview, and fine-tune your flow.`}
    >
      <span class="text-2xl font-black tracking-tight text-primary sm:text-3xl">Kelpie</span>
    </div>
  </div>

  <div class="navbar-center flex flex-1 items-center justify-center">
    <div
      class="dock flex flex-row items-center gap-2 rounded-full border border-base-300/70 bg-base-100/70 px-2 py-1.5 shadow-sm"
      role="group"
      aria-label="Select workspace mode"
      data-testid="view-mode-toggle"
    >
      {#each viewOptions as option (option.id)}
        <button
          type="button"
          class={viewButtonClasses(option.id)}
          on:click={() => handleViewChange(option.id)}
          aria-pressed={$shellState.viewMode === option.id}
          aria-label={option.label}
          title={option.label}
          data-testid={`view-mode-${option.id}`}
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
              <path
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m12 4.75 1.28.74a1 1 0 0 0 1.46-.54l.42-1.43 2.06.6-.06 1.5a1 1 0 0 0 .86 1.02l1.47.23-.32 2.13-1.42.23a1 1 0 0 0-.83 1.17l.27 1.45-1.97.9-.8-1.22a1 1 0 0 0-1.32-.32l-1.28.74-1.28-.74a1 1 0 0 0-1.46.54l-.42 1.43-2.06-.6.06-1.5a1 1 0 0 0-.86-1.02l-1.47-.23.32-2.13 1.42-.23a1 1 0 0 0 .83-1.17l-.27-1.45 1.97-.9.8 1.22a1 1 0 0 0 1.32.32Z"
              />
              <circle cx="12" cy="12" r="2.25" stroke-width="1.5" />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div class="flex flex-1 flex-wrap items-center justify-end gap-3 sm:gap-4">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="h-4 w-4"
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
                <path
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m12 4.75 1.28.74a1 1 0 0 0 1.46-.54l.42-1.43 2.06.6-.06 1.5a1 1 0 0 0 .86 1.02l1.47.23-.32 2.13-1.42.23a1 1 0 0 0-.83 1.17l.27 1.45-1.97.9-.8-1.22a1 1 0 0 0-1.32-.32l-1.28.74-1.28-.74a1 1 0 0 0-1.46.54l-.42 1.43-2.06-.6.06-1.5a1 1 0 0 0-.86-1.02l-1.47-.23.32-2.13 1.42-.23a1 1 0 0 0 .83-1.17l-.27-1.45 1.97-.9.8 1.22a1 1 0 0 0 1.32.32Z"
                />
                <circle cx="12" cy="12" r="2.25" stroke-width="1.5" />
              </svg>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <div class="min-w-[9.5rem] sm:w-auto">
      <SaveIndicator />
    </div>

    <div
      class="dock flex flex-row items-center gap-2 rounded-full border border-base-300/70 bg-base-100/70 px-2 py-1.5 shadow-sm"
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
              class="h-5 w-5"
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
              class="h-5 w-5"
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
              class="h-5 w-5"
            >
              <path
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m12 4.75 1.28.74a1 1 0 0 0 1.46-.54l.42-1.43 2.06.6-.06 1.5a1 1 0 0 0 .86 1.02l1.47.23-.32 2.13-1.42.23a1 1 0 0 0-.83 1.17l.27 1.45-1.97.9-.8-1.22a1 1 0 0 0-1.32-.32l-1.28.74-1.28-.74a1 1 0 0 0-1.46.54l-.42 1.43-2.06-.6.06-1.5a1 1 0 0 0-.86-1.02l-1.47-.23.32-2.13 1.42-.23a1 1 0 0 0 .83-1.17l-.27-1.45 1.97-.9.8 1.22a1 1 0 0 0 1.32.32Z"
              />
              <circle cx="12" cy="12" r="2.25" stroke-width="1.5" />
            </svg>
          {/if}
        </button>
      {/each}
    </div>

    <button
      type="button"
      class="btn btn-circle btn-sm border border-base-300/60 bg-base-100/80 text-base-content shadow-sm sm:btn-md hover:border-primary/40"
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
</header>
