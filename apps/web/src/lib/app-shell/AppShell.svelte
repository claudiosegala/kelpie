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
        layout === "desktop"
            ? viewMode === "editor-preview"
            : activePanel === "editor" && viewMode !== "settings";
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

<div
    class="flex min-h-screen flex-col bg-base-200/80 text-base-content"
    data-layout={layout}
    data-mode={viewMode}
>
    <Toolbar {version} />
    <main
        class={`grid flex-1 gap-4 p-4 transition-all duration-300 ${
            layout === "desktop"
                ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                : "grid-cols-1"
        }`}
        data-layout={layout}
    >
        <section
            class={`card h-full overflow-hidden border border-base-300/60 bg-base-100 shadow-sm transition-all duration-300 ${
                showEditor ? "opacity-100" : "opacity-0"
            }`}
            aria-label={panelLabels.editor}
            hidden={!showEditor}
            data-panel="editor"
        >
            <div class="card-body h-full gap-0 overflow-hidden p-0">
                <slot name="editor" />
            </div>
        </section>
        <section
            class={`card h-full overflow-hidden border border-base-300/60 bg-base-100 shadow-sm transition-all duration-300 ${
                showPreview ? "opacity-100" : "opacity-0"
            }`}
            aria-label={panelLabels.preview}
            hidden={!showPreview}
            data-panel="preview"
        >
            <div class="card-body h-full gap-0 overflow-hidden p-0">
                <slot name="preview" />
            </div>
        </section>
        <section
            class={`card h-full overflow-hidden border border-base-300/60 bg-base-100 shadow-sm transition-all duration-300 ${
                showSettings ? "opacity-100" : "opacity-0"
            }`}
            aria-label={panelLabels.settings}
            hidden={!showSettings}
            data-panel="settings"
        >
            <div class="card-body h-full gap-0 overflow-hidden p-0">
                <slot name="settings" />
            </div>
        </section>
    </main>
</div>
