<svelte:options runes={false} />

<script lang="ts">
  import SaveIndicator from "./SaveIndicator.svelte";
  import PanelToggleGroup from "./PanelToggleGroup.svelte";
  import ThemeToggleButton from "./ThemeToggleButton.svelte";
  import ViewModeToggleButton from "./ViewModeToggleButton.svelte";

  export let version: string;
</script>

<header
  class="sticky top-0 z-30 flex w-full flex-wrap items-center justify-between gap-3 border-b border-base-300/70 bg-base-100/95 px-3 py-2 backdrop-blur"
>
  <div class="flex items-center gap-3">
    <div
      class="tooltip tooltip-bottom"
      data-tip={`Kelpie ${version}\nMarkdown to-do studio — edit, preview, and fine-tune your flow.`}
      data-testid="toolbar-brand-tooltip"
    >
      <span class="text-2xl font-black tracking-tight text-primary sm:text-3xl" data-testid="toolbar-brand-label">
        Kelpie
      </span>
    </div>
  </div>

  <div class="flex flex-1 flex-wrap items-center justify-end gap-3 sm:gap-4">
    <PanelToggleGroup />

    <div class="sm:w-auto">
      <SaveIndicator />
    </div>

    <ViewModeToggleButton />

    <ThemeToggleButton />
  </div>
</header>
