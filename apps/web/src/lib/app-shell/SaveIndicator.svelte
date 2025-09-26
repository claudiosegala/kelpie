<svelte:options runes={false} />

<script lang="ts">
  import SaveIndicatorIcon from "./SaveIndicatorIcon.svelte";
  import { saveStatus } from "$lib/stores/persistence";
  import { SaveStatusKind } from "$lib/app-shell/contracts";
  import { LOCAL_SAVE_TOOLTIP, toneFor, tooltipFor, getTimestampDetails } from "./save-indicator.config";

  const BASE_BADGE_CLASSES = "indicator";

  $: status = $saveStatus;
  $: statusLabel = status.message;
  $: tone = toneFor(status.kind);
  $: timestampDetails = getTimestampDetails(status);
  $: tooltipBase = tooltipFor(status.kind) ?? LOCAL_SAVE_TOOLTIP;
  $: tooltipMessage = timestampDetails ? `${tooltipBase}\n${timestampDetails.tooltipLine}` : tooltipBase;
  $: badgeClasses = [
    BASE_BADGE_CLASSES,
    tone.badge,
    status.kind === SaveStatusKind.Saving ? "indicator--saving animate-pulse" : ""
  ]
    .filter(Boolean)
    .join(" ");
</script>

<div class="indicator-tooltip tooltip tooltip-bottom" data-tip={tooltipMessage} data-testid="save-indicator-tooltip">
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <span
    class={badgeClasses}
    data-kind={status.kind}
    data-testid="save-indicator"
    aria-live="polite"
    role="status"
    title={tooltipMessage}
    aria-label={`${statusLabel}. ${tooltipMessage}`}
    tabindex="0"
  >
    <SaveIndicatorIcon kind={status.kind} toneClass={tone.icon} />
    <span class="indicator__label" data-testid="save-indicator-label">{statusLabel}</span>
    {#if timestampDetails}
      <span class="indicator__timestamp" data-testid="save-indicator-timestamp">
        {timestampDetails.display}
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
