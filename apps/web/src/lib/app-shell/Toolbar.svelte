<svelte:options runes={false} />

<script lang="ts">
  import PanelToggleGroup from "./PanelToggleGroup.svelte";
  import SaveIndicator from "./SaveIndicator.svelte";
  import ThemeToggleButton from "./ThemeToggleButton.svelte";
  import ToolbarBrand from "./ToolbarBrand.svelte";
  import ViewModeToggleButton from "./ViewModeToggleButton.svelte";
  import {
    TOOLBAR_BRAND_CLUSTER_CLASSES,
    TOOLBAR_CONTROLS_CLUSTER_CLASSES,
    TOOLBAR_SAVE_INDICATOR_WRAPPER_CLASSES,
    TOOLBAR_TEST_IDS,
    TOOLBAR_WRAPPER_CLASSES
  } from "./toolbar.constants";

  export let version: string;
</script>

<header class={TOOLBAR_WRAPPER_CLASSES} data-testid={TOOLBAR_TEST_IDS.root}>
  <div class={TOOLBAR_BRAND_CLUSTER_CLASSES} data-testid={TOOLBAR_TEST_IDS.brandCluster}>
    <ToolbarBrand {version} />
  </div>

  <div class={TOOLBAR_CONTROLS_CLUSTER_CLASSES} data-testid={TOOLBAR_TEST_IDS.controlsCluster}>
    <PanelToggleGroup />

    <div class={TOOLBAR_SAVE_INDICATOR_WRAPPER_CLASSES} data-testid={TOOLBAR_TEST_IDS.saveIndicatorWrapper}>
      <SaveIndicator />
    </div>

    <ViewModeToggleButton />

    <ThemeToggleButton />
  </div>
</header>
