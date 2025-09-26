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

  $: showEditor = viewMode === "editor-preview";
  $: showPreview = viewMode !== "settings";
  $: showSettings = viewMode === "settings";

  const panelLabels: Record<PanelId, string> = {
    editor: "Code editor",
    preview: "Preview",
    settings: "Settings"
  };
</script>

<div class="flex min-h-screen flex-col bg-base-200 text-base-content" data-layout={layout} data-mode={viewMode}>
  <Toolbar {version} />
  <main
    class="flex min-h-[calc(100vh-4.5rem)] w-full flex-1 items-stretch gap-5 overflow-x-auto px-3 pb-6 pt-4 transition-all duration-300 sm:px-5 lg:mx-auto lg:max-w-5xl lg:px-6"
    data-layout={layout}
  >
    <section
      class="flex h-full min-h-[calc(100vh-6rem)] min-w-[22rem] max-w-full flex-1 flex-col overflow-hidden rounded-3xl border border-base-300/70 bg-base-100/90 shadow-lg shadow-base-300/30 backdrop-blur"
      aria-label={panelLabels.editor}
      hidden={!showEditor}
      data-active={showEditor}
      data-panel="editor"
    >
      <div class="flex h-full flex-col overflow-hidden">
        <slot name="editor" />
      </div>
    </section>
    <section
      class="flex h-full min-h-[calc(100vh-6rem)] min-w-[22rem] max-w-full flex-1 flex-col overflow-hidden rounded-3xl border border-base-300/70 bg-base-100/90 shadow-lg shadow-base-300/30 backdrop-blur"
      aria-label={panelLabels.preview}
      hidden={!showPreview}
      data-active={showPreview}
      data-panel="preview"
    >
      <div class="flex h-full flex-col overflow-hidden">
        <slot name="preview" />
      </div>
    </section>
    <section
      class="flex h-full min-h-[calc(100vh-6rem)] min-w-[22rem] max-w-full flex-1 flex-col overflow-hidden rounded-3xl border border-base-300/70 bg-base-100/90 shadow-lg shadow-base-300/30 backdrop-blur"
      aria-label={panelLabels.settings}
      hidden={!showSettings}
      data-active={showSettings}
      data-panel="settings"
    >
      <div class="flex h-full flex-col overflow-hidden">
        <slot name="settings" />
      </div>
    </section>
  </main>
</div>
