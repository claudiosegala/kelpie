<svelte:options runes={false} />

<script lang="ts">
  import { onDestroy } from "svelte";
  import Toolbar from "./Toolbar.svelte";
  import { shellState, startLayoutWatcher } from "$lib/stores/shell";
  import type { PanelId } from "./contracts";

  export let version = "0.0.0";

  let stopLayoutWatcher: (() => void) | undefined;

  if (typeof window !== "undefined") {
    stopLayoutWatcher = startLayoutWatcher();
  }

  onDestroy(() => {
    stopLayoutWatcher?.();
  });

  $: layout = $shellState.layout;
  $: viewMode = $shellState.viewMode;
  $: activePanel = $shellState.activePanel;

  $: showEditor =
    layout === "desktop" ? viewMode === "editor-preview" : activePanel === "editor" && viewMode !== "settings";
  $: showPreview =
    layout === "desktop"
      ? viewMode !== "settings"
      : (activePanel === "preview" && viewMode !== "settings") || viewMode === "preview-only";
  $: showSettings = viewMode === "settings" && (layout === "desktop" || activePanel === "settings");

  const panelLabels: Record<PanelId, string> = {
    editor: "Code editor",
    preview: "Preview",
    settings: "Settings"
  };
</script>

<div class="flex min-h-screen flex-col bg-base-200 text-base-content" data-layout={layout} data-mode={viewMode}>
  <Toolbar {version} />
  <main
    class={`grid min-h-[calc(100vh-4.5rem)] w-full flex-1 content-end items-end gap-5 px-3 pb-6 pt-4 transition-all duration-300 sm:px-5 lg:mx-auto lg:max-w-5xl lg:auto-rows-[minmax(0,1fr)] lg:px-6 ${
      layout === "desktop" && viewMode !== "settings"
        ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
        : "grid-cols-1"
    }`}
    data-layout={layout}
  >
    <section
      class={`flex h-full min-h-[calc(100vh-6rem)] min-w-[20rem] flex-col self-end overflow-hidden rounded-3xl border border-base-300/70 bg-base-100/90 shadow-lg shadow-base-300/30 backdrop-blur transition-all duration-300 lg:min-w-[37.5rem] lg:justify-self-start ${
        showEditor ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-label={panelLabels.editor}
      hidden={!showEditor}
      data-panel="editor"
    >
      <div class="flex h-full flex-col overflow-hidden">
        <slot name="editor" />
      </div>
    </section>
    <section
      class={`flex h-full min-h-[calc(100vh-6rem)] min-w-[20rem] flex-col self-end overflow-hidden rounded-3xl border border-base-300/70 bg-base-100/90 shadow-lg shadow-base-300/30 backdrop-blur transition-all duration-300 lg:min-w-[37.5rem] lg:justify-self-center ${
        showPreview ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-label={panelLabels.preview}
      hidden={!showPreview}
      data-panel="preview"
    >
      <div class="flex h-full flex-col overflow-hidden">
        <slot name="preview" />
      </div>
    </section>
    <section
      class={`flex h-full min-h-[calc(100vh-6rem)] min-w-[20rem] flex-col overflow-hidden rounded-3xl border border-base-300/70 bg-base-100/90 shadow-lg shadow-base-300/30 backdrop-blur transition-all duration-300 lg:min-w-[30rem] ${
        viewMode === "settings" ? "lg:self-center lg:justify-self-center" : "self-end lg:justify-self-end"
      } ${showSettings ? "opacity-100" : "pointer-events-none opacity-0"}`}
      aria-label={panelLabels.settings}
      hidden={!showSettings}
      data-panel="settings"
    >
      <div class="flex h-full flex-col overflow-hidden">
        <slot name="settings" />
      </div>
    </section>
  </main>
</div>
