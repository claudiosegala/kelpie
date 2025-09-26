<svelte:options runes={false} />

<script lang="ts">
  import { BRAND_NAME, buildBrandTooltip } from "./toolbar.constants";

  export let version: string;

  $: tooltipCopy = buildBrandTooltip(version);
</script>

<div class="tooltip tooltip-bottom" data-tip={tooltipCopy} title={tooltipCopy} data-testid="toolbar-brand-tooltip">
  <span class="text-2xl font-black tracking-tight text-primary sm:text-3xl" data-testid="toolbar-brand-label">
    {BRAND_NAME}
  </span>
</div>
