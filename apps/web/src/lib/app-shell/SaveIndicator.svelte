<svelte:options runes={false} />

<script lang="ts">
  import { saveStatus } from "$lib/stores/persistence";

  $: status = $saveStatus;
  $: statusLabel = status.message;
  $: lastSavedAt = status.timestamp && status.kind === "saved" ? new Date(status.timestamp) : undefined;
  $: formattedTimestamp = lastSavedAt?.toLocaleTimeString();
  const localSaveTooltip =
    "Changes are stored locally on this device for now. Cloud sync will be introduced in a future release.";
  const errorTooltip =
    "We couldn't save locally. Retry or export your data to keep a copy while we work on cloud sync.";
  $: tooltipMessage = (() => {
    const base = status.kind === "error" ? errorTooltip : localSaveTooltip;
    if (formattedTimestamp) {
      return `${base}\nLast saved at ${formattedTimestamp}.`;
    }
    return base;
  })();

  type ToneClasses = { container: string; label: string };

  $: tone = (() => {
    const base: ToneClasses = {
      container: "border-success/60 bg-success/10 text-success/90",
      label: "text-success"
    };
    if (status.kind === "error") {
      return {
        container: "border-error/60 bg-error/10 text-error/90",
        label: "text-error"
      } satisfies ToneClasses;
    }
    if (status.kind === "saving") {
      return {
        container: "border-info/60 bg-info/10 text-info/90 animate-pulse",
        label: "text-info"
      } satisfies ToneClasses;
    }
    return base;
  })();

  $: containerClasses = [
    "flex flex-col gap-1 rounded-2xl border px-3 py-2 text-xs shadow-sm backdrop-blur transition-all duration-300",
    tone.container
  ].join(" ");
</script>

<div class="tooltip tooltip-bottom w-full md:w-auto" data-tip={tooltipMessage}>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div
    class={containerClasses}
    data-kind={status.kind}
    aria-live="polite"
    title={tooltipMessage}
    aria-label={`${statusLabel}. ${tooltipMessage}`}
    tabindex="0"
  >
    <div class="flex items-center gap-2">
      <span
        class="badge badge-xs border border-info/40 bg-info/20 text-info/90"
        class:hidden={status.kind !== "saving"}
        class:animate-pulse={status.kind === "saving"}
        aria-hidden="true">&nbsp;</span
      >
      <span class={`text-sm font-medium tracking-tight ${tone.label}`}>{statusLabel}</span>
      {#if formattedTimestamp}
        <span class="text-xs text-base-content/60">({formattedTimestamp})</span>
      {/if}
    </div>
  </div>
</div>
