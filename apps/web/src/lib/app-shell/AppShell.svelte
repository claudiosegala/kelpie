<svelte:options runes={false} />

<script lang="ts">
  import { onDestroy } from "svelte";
  import Toolbar from "./Toolbar.svelte";
  import { shellState, startLayoutWatcher } from "$lib/stores/shell";
  import type { PanelId, ViewMode } from "./contracts";

  export let version = "0.0.0";

  type PanelDefinition = {
    id: PanelId;
    label: string;
    slot: PanelId;
    isVisible: (mode: ViewMode) => boolean;
  };

  const PANELS: PanelDefinition[] = [
    {
      id: "editor",
      label: "Code editor",
      slot: "editor",
      isVisible: (mode) => mode === "editor-preview"
    },
    {
      id: "preview",
      label: "Preview",
      slot: "preview",
      isVisible: (mode) => mode !== "settings"
    },
    {
      id: "settings",
      label: "Settings",
      slot: "settings",
      isVisible: (mode) => mode === "settings"
    }
  ];

  let stopLayoutWatcher: (() => void) | undefined;

  if (typeof window !== "undefined") {
    stopLayoutWatcher = startLayoutWatcher();
  }

  onDestroy(() => {
    stopLayoutWatcher?.();
  });

  $: layout = $shellState.layout;
  $: viewMode = $shellState.viewMode;
  $: visiblePanels = PANELS.filter((panel) => panel.isVisible(viewMode));
  $: settingsIsSolo = visiblePanels.length === 1 && visiblePanels[0]?.id === "settings";
  $: activePanel = $shellState.activePanel;

  function mainClasses(): string {
    return settingsIsSolo ? "app-shell__main app-shell__main--centered" : "app-shell__main";
  }

  function panelClasses(panel: PanelDefinition): string {
    if (panel.id === "settings") {
      return settingsIsSolo ? "app-shell__panel app-shell__panel--full" : "app-shell__panel app-shell__panel--stacked";
    }

    return "app-shell__panel app-shell__panel--stacked";
  }

  function panelIsActive(panel: PanelDefinition): boolean {
    if (layout === "desktop") {
      return true;
    }

    return panel.id === activePanel;
  }

  function panelIsHidden(panel: PanelDefinition): boolean {
    if (layout === "desktop") {
      return false;
    }

    return panel.id !== activePanel;
  }
</script>

<div class="app-shell" data-layout={layout} data-mode={viewMode} data-testid="app-shell">
  <Toolbar {version} />
  <main class={mainClasses()} data-layout={layout}>
    {#each visiblePanels as panel (panel.id)}
      <section
        class={panelClasses(panel)}
        aria-label={panel.label}
        data-active={panelIsActive(panel)}
        data-panel={panel.id}
        data-testid={`panel-${panel.id}`}
        hidden={panelIsHidden(panel)}
      >
        <div class="app-shell__panel-content">
          <slot name={panel.slot} />
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
