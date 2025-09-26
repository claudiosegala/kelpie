<svelte:options runes={false} />

<script lang="ts">
  import { saveStatus } from "$lib/stores/persistence";

  $: status = $saveStatus;
  $: statusLabel = status.message;
  $: timestampLabel = status.timestamp ? new Date(status.timestamp).toLocaleTimeString() : undefined;
  const localSaveTooltip =
    "Changes are stored locally on this device for now. Cloud sync will be introduced in a future release.";
  const errorTooltip =
    "We couldn't save locally. Retry or export your data to keep a copy while we work on cloud sync.";
  $: tooltipMessage = status.kind === "error" ? errorTooltip : localSaveTooltip;

  type ToneClasses = { container: string; badge: string };

  $: tone = (() => {
    const base: ToneClasses = {
      container: "border-success/60 bg-success/10 text-success",
      badge: "badge-success"
    };
    if (status.kind === "error") {
      return { container: "border-error/60 bg-error/10 text-error", badge: "badge-error" } satisfies ToneClasses;
    }
    if (status.kind === "saving") {
      return { container: "border-info/60 bg-info/10 text-info", badge: "badge-info" } satisfies ToneClasses;
    }
    return base;
  })();

  $: containerClasses = [
    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-sm backdrop-blur transition-all duration-300",
    tone.container
  ].join(" ");

  $: badgeClasses = ["badge badge-xs border-0", tone.badge, status.kind === "saving" ? "animate-pulse" : ""]
    .filter(Boolean)
    .join(" ");
</script>

<div class="tooltip tooltip-bottom w-full md:w-auto" data-tip={tooltipMessage}>
  <div
    class={containerClasses}
    data-kind={status.kind}
    aria-live="polite"
    title={tooltipMessage}
    aria-label={`${statusLabel}. ${tooltipMessage}`}
    tabindex="0"
  >
    <span class={badgeClasses} aria-hidden="true"></span>
    <span class="font-medium">{statusLabel}</span>
    {#if timestampLabel && status.kind === "saved"}
      <span class="text-base-content/60 text-xs">({timestampLabel})</span>
    {/if}
    <span class="text-base-content/50 text-xs" aria-hidden="true">ⓘ</span>
  </div>
</div>
