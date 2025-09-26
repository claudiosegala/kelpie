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

  $: mainClasses = [
    "flex min-h-[calc(100vh-4.5rem)] w-full flex-1 items-stretch gap-5 overflow-x-auto px-3 pb-6 pt-4 transition-all duration-300 sm:px-5 lg:mx-auto lg:max-w-5xl lg:px-6",
    showSettings ? "justify-center" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const basePanelClasses =
    "flex h-full min-h-[calc(100vh-6rem)] max-w-full flex-1 flex-col overflow-hidden rounded-3xl border border-base-300/70 bg-base-100/90 shadow-lg shadow-base-300/30 backdrop-blur";

  const stackedPanelClasses = `${basePanelClasses} min-w-[22rem]`;

  $: settingsPanelClasses = [
    basePanelClasses,
    showSettings && !showEditor && !showPreview ? "min-w-full" : "min-w-[22rem]"
  ]
    .filter(Boolean)
    .join(" ");

  const panelLabels: Record<PanelId, string> = {
    editor: "Code editor",
    preview: "Preview",
    settings: "Settings"
  };
</script>

<div class="flex min-h-screen flex-col bg-base-200 text-base-content" data-layout={layout} data-mode={viewMode}>
  <Toolbar {version} />
  <main class={mainClasses} data-layout={layout}>
    {#if showEditor}
      <section class={stackedPanelClasses} aria-label={panelLabels.editor} data-active={showEditor} data-panel="editor">
        <div class="h-full flex-1 flex-col overflow-hidden">
          <slot name="editor" />
        </div>
      </section>
    {/if}
    {#if showPreview}
      <section
        class={stackedPanelClasses}
        aria-label={panelLabels.preview}
        data-active={showPreview}
        data-panel="preview"
      >
        <div class="h-full flex-1 flex-col overflow-hidden">
          <slot name="preview" />
        </div>
      </section>
    {/if}
    {#if showSettings}
      <section
        class={settingsPanelClasses}
        aria-label={panelLabels.settings}
        data-active={showSettings}
        data-panel="settings"
      >
        <div class="h-full flex-1 flex-col overflow-hidden">
          <slot name="settings" />
        </div>
      </section>
    {/if}
  </main>
</div>
