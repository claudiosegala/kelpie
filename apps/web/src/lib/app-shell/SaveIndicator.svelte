<svelte:options runes={false} />

<script lang="ts">
  import SaveIndicatorIcon from "./SaveIndicatorIcon.svelte";
  import { saveStatus } from "$lib/stores/persistence";
  import type { SaveStatus } from "$lib/app-shell/contracts";

  const localSaveTooltip =
    "Changes are stored locally on this device for now. Cloud sync will be introduced in a future release.";
  const errorTooltip =
    "We couldn't save locally. Retry or export your data to keep a copy while we work on cloud sync.";

  type ToneClasses = { badge: string; icon: string };

  const toneByKind: Record<SaveStatus["kind"], ToneClasses> = {
    idle: {
      badge: "border-success/40 bg-success/10 text-success",
      icon: "text-success"
    },
    saving: {
      badge: "border-info/40 bg-info/10 text-info",
      icon: "text-info"
    },
    saved: {
      badge: "border-success/40 bg-success/10 text-success",
      icon: "text-success"
    },
    error: {
      badge: "border-error/40 bg-error/10 text-error",
      icon: "text-error"
    }
  };

  const tooltipByKind: Record<SaveStatus["kind"], string> = {
    idle: localSaveTooltip,
    saving: localSaveTooltip,
    saved: localSaveTooltip,
    error: errorTooltip
  };

  $: status = $saveStatus;
  $: statusLabel = status.message;
  $: tone = toneByKind[status.kind] ?? toneByKind.saved;
  $: lastSavedAt = status.timestamp && status.kind === "saved" ? new Date(status.timestamp) : undefined;
  $: formattedTimestamp = lastSavedAt?.toLocaleTimeString();
  $: tooltipBase = tooltipByKind[status.kind] ?? localSaveTooltip;
  $: tooltipMessage = formattedTimestamp ? `${tooltipBase}\nLast saved at ${formattedTimestamp}.` : tooltipBase;
  $: badgeClasses = ["indicator", tone.badge, status.kind === "saving" ? "indicator--saving animate-pulse" : ""]
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
    {#if formattedTimestamp}
      <span class="indicator__timestamp" data-testid="save-indicator-timestamp">
        ({formattedTimestamp})
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
