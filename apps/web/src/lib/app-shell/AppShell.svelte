<svelte:options runes={false} />

<script lang="ts">
  import { onDestroy } from "svelte";
  import Toolbar from "./Toolbar.svelte";
  import { shellState, startLayoutWatcher } from "$lib/stores/shell";
  import { isPanelAllowedInMode } from "./contracts";
  import { getVisiblePanels, type PanelDefinition } from "./panels";

  export let version = "0.0.0";

  let stopLayoutWatcher: (() => void) | undefined;

  if (typeof window !== "undefined") {
    stopLayoutWatcher = startLayoutWatcher();
  }

  onDestroy(() => {
    stopLayoutWatcher?.();
  });

  const MAIN_CLASS = "app-shell__main";
  const MAIN_CENTERED_CLASS = "app-shell__main app-shell__main--centered";
  const PANEL_STACKED_CLASS = "app-shell__panel app-shell__panel--stacked";
  const PANEL_FULL_CLASS = "app-shell__panel app-shell__panel--full";

  type PanelPresentation = PanelDefinition & {
    className: string;
    isHidden: boolean;
  };

  $: layout = $shellState.layout;
  $: viewMode = $shellState.viewMode;
  $: visiblePanels = getVisiblePanels(viewMode);
  $: settingsIsSolo = visiblePanels.length === 1 && visiblePanels[0]?.id === "settings";
  $: activePanel = $shellState.activePanel;
  $: isDesktopLayout = layout === "desktop";
  $: mainClassName = settingsIsSolo ? MAIN_CENTERED_CLASS : MAIN_CLASS;
  $: panelPresentations = visiblePanels.map((panel): PanelPresentation => {
    const isSettingsPanel = panel.id === "settings";
    const className = isSettingsPanel && settingsIsSolo ? PANEL_FULL_CLASS : PANEL_STACKED_CLASS;
    const isHidden = !isDesktopLayout && panel.id !== activePanel;

    return {
      ...panel,
      className,
      isHidden
    };
  });
</script>

<div class="app-shell" data-layout={layout} data-mode={viewMode} data-testid="app-shell">
  <Toolbar {version} />
  <main class={mainClassName} data-layout={layout}>
    {#each panelPresentations as panel (panel.id)}
      <section
        class={panel.className}
        aria-label={panel.label}
        data-active={isPanelAllowedInMode(panel.id, viewMode)}
        data-panel={panel.id}
        data-testid={`panel-${panel.id}`}
        hidden={panel.isHidden}
      >
        <div class="app-shell__panel-content">
          {#if panel.slot === "editor"}
            <slot name="editor" />
          {:else if panel.slot === "preview"}
            <slot name="preview" />
          {:else}
            <slot name="settings" />
          {/if}
        </div>
      </section>
    {/each}
  </main>
</div>

<style lang="postcss">
  .app-shell {
    @apply flex min-h-screen flex-col bg-base-200 text-base-content;
  }

  .app-shell__main {
    @apply flex min-h-0 w-full flex-1 items-stretch gap-5 overflow-x-auto px-3 py-4 transition-all duration-300 sm:px-5 lg:mx-auto lg:max-w-5xl lg:px-6;
  }

  .app-shell__main--centered {
    @apply justify-center;
  }

  .app-shell__panel {
    @apply flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-3xl border border-base-300/70 bg-base-100/90 shadow-lg shadow-base-300/30 backdrop-blur;
  }

  .app-shell__panel--stacked {
    @apply min-w-[22rem];
  }

  .app-shell__panel--full {
    @apply min-w-full;
  }

  .app-shell__panel-content {
    @apply flex h-full min-h-0 flex-1 flex-col overflow-hidden;
  }
</style>
