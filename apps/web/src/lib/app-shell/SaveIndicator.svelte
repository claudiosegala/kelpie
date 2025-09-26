<svelte:options runes={false} />

<script lang="ts">
  import SaveIndicatorIcon from "./SaveIndicatorIcon.svelte";
  import { saveStatus } from "$lib/stores/persistence";
  import type { SaveStatus } from "$lib/app-shell/contracts";

  const LOCAL_SAVE_TOOLTIP =
    "Changes are stored locally on this device for now. Cloud sync will be introduced in a future release.";
  const ERROR_TOOLTIP =
    "We couldn't save locally. Retry or export your data to keep a copy while we work on cloud sync.";

  type ToneToken = "success" | "info" | "error";
  type ToneClasses = { badge: string; icon: string };

  const TONE_CLASSES: Record<ToneToken, ToneClasses> = {
    success: {
      badge: "border-success/40 bg-success/10 text-success",
      icon: "text-success"
    },
    info: {
      badge: "border-info/40 bg-info/10 text-info",
      icon: "text-info"
    },
    error: {
      badge: "border-error/40 bg-error/10 text-error",
      icon: "text-error"
    }
  };

  type StatusConfig = {
    tone: ToneToken;
    tooltip: string;
    isSaving?: boolean;
  };

  const STATUS_CONFIG: Record<SaveStatus["kind"], StatusConfig> = {
    idle: { tone: "success", tooltip: LOCAL_SAVE_TOOLTIP },
    saving: { tone: "info", tooltip: LOCAL_SAVE_TOOLTIP, isSaving: true },
    saved: { tone: "success", tooltip: LOCAL_SAVE_TOOLTIP },
    error: { tone: "error", tooltip: ERROR_TOOLTIP }
  };

  const FALLBACK_STATUS_CONFIG = STATUS_CONFIG.saved;

  type IndicatorState = {
    kind: SaveStatus["kind"];
    label: string;
    tone: ToneClasses;
    tooltip: string;
    isSaving: boolean;
    formattedTimestamp?: string;
    ariaLabel: string;
  };

  function formatSavedTimestamp(status: SaveStatus): string | undefined {
    if (status.kind !== "saved" || status.timestamp == null) {
      return undefined;
    }

    const date = new Date(status.timestamp);
    return Number.isNaN(date.valueOf()) ? undefined : date.toLocaleTimeString();
  }

  function buildTooltipMessage(base: string, formattedTimestamp?: string): string {
    return formattedTimestamp ? `${base}\nLast saved at ${formattedTimestamp}.` : base;
  }

  function buildAriaLabel(label: string, tooltip: string): string {
    return `${label}. ${tooltip}`;
  }

  function resolveIndicatorState(status: SaveStatus): IndicatorState {
    const config = STATUS_CONFIG[status.kind] ?? FALLBACK_STATUS_CONFIG;
    const tone = TONE_CLASSES[config.tone];
    const formattedTimestamp = formatSavedTimestamp(status);
    const tooltip = buildTooltipMessage(config.tooltip, formattedTimestamp);
    const isSaving = Boolean(config.isSaving && status.kind === "saving");

    return {
      kind: status.kind,
      label: status.message,
      tone,
      tooltip,
      isSaving,
      formattedTimestamp,
      ariaLabel: buildAriaLabel(status.message, tooltip)
    };
  }

  $: status = $saveStatus;
  $: indicatorState = resolveIndicatorState(status);
</script>

<div
  class="indicator-tooltip tooltip tooltip-bottom"
  data-tip={indicatorState.tooltip}
  data-testid="save-indicator-tooltip"
>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <span
    class={`indicator ${indicatorState.tone.badge}`}
    class:indicator--saving={indicatorState.isSaving}
    class:animate-pulse={indicatorState.isSaving}
    data-kind={indicatorState.kind}
    data-testid="save-indicator"
    aria-live="polite"
    role="status"
    title={indicatorState.tooltip}
    aria-label={indicatorState.ariaLabel}
    tabindex="0"
  >
    <SaveIndicatorIcon kind={indicatorState.kind} toneClass={indicatorState.tone.icon} />
    <span class="indicator__label" data-testid="save-indicator-label">{indicatorState.label}</span>
    {#if indicatorState.formattedTimestamp}
      <span class="indicator__timestamp" data-testid="save-indicator-timestamp">
        ({indicatorState.formattedTimestamp})
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
