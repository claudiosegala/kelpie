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

<div class="app-shell" data-layout={layout} data-mode={viewMode}>
    <Toolbar {version} />
    <main class="panels" data-layout={layout}>
        <section class="panel editor" aria-label={panelLabels.editor} hidden={!showEditor}>
            <slot name="editor" />
        </section>
        <section class="panel preview" aria-label={panelLabels.preview} hidden={!showPreview}>
            <slot name="preview" />
        </section>
        <section class="panel settings" aria-label={panelLabels.settings} hidden={!showSettings}>
            <slot name="settings" />
        </section>
    </main>
</div>

<style>
    .app-shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: var(--app-shell-bg, #f3f4f6);
        color: var(--app-shell-fg, #111827);
    }

    .panels {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr;
        gap: 0;
        overflow: hidden;
    }

    .panels[data-layout="desktop"] {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }

    .panel {
        display: flex;
        flex-direction: column;
        background: #ffffff;
        border-right: 1px solid #e5e7eb;
        overflow: hidden;
    }

    .panel:last-child {
        border-right: none;
    }

    .panel[hidden] {
        display: none;
    }

    @media (max-width: 960px) {
        .panels[data-layout="mobile"] {
            grid-template-columns: minmax(0, 1fr);
        }
    }
</style>
