<svelte:options runes={false} />

<script lang="ts">
  import SaveIndicatorIcon from "./SaveIndicatorIcon.svelte";
  import { saveStatus } from "$lib/stores/persistence";
  import { buildSaveIndicatorViewModel } from "./save-indicator.viewmodel";

  $: status = $saveStatus;
  $: viewModel = buildSaveIndicatorViewModel(status);
</script>

<div
  class="indicator-tooltip tooltip tooltip-bottom"
  data-tip={viewModel.tooltipMessage}
  data-testid="save-indicator-tooltip"
>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <span
    class={viewModel.badgeClasses}
    data-kind={viewModel.kind}
    data-testid="save-indicator"
    aria-live="polite"
    role="status"
    title={viewModel.tooltipMessage}
    aria-label={viewModel.ariaLabel}
    tabindex="0"
  >
    <SaveIndicatorIcon kind={viewModel.kind} toneClass={viewModel.iconToneClass} />
    <span class="indicator__label" data-testid="save-indicator-label">{viewModel.label}</span>
    {#if viewModel.timestampDetails}
      <span class="indicator__timestamp" data-testid="save-indicator-timestamp">
        {viewModel.timestampDetails.display}
      </span>
    {/if}
  </span>
</div>

<style lang="postcss">
  .indicator-tooltip {
    @apply w-full md:w-auto;
  }

  .indicator {
    @apply badge badge-lg w-full justify-start gap-2 border px-3 py-3 text-left text-sm font-medium shadow-sm transition-all duration-300 md:w-auto;
  }

  .indicator--saving {
    @apply animate-pulse;
  }

  .indicator__label {
    @apply leading-tight;
  }

  .indicator__timestamp {
    @apply text-xs text-base-content/60;
  }
</style>
