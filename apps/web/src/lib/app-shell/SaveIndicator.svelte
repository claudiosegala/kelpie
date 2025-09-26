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
</script>

<div
  class="save-indicator"
  data-kind={status.kind}
  aria-live="polite"
  title={tooltipMessage}
  aria-label={`${statusLabel}. ${tooltipMessage}`}
>
  <span class="pulse" aria-hidden="true"></span>
  <span class="message">{statusLabel}</span>
  {#if timestampLabel && status.kind === "saved"}
    <span class="timestamp">({timestampLabel})</span>
  {/if}
  <span class="tooltip-trigger" tabindex="0" role="img" aria-label={tooltipMessage} title={tooltipMessage}>ⓘ</span>
</div>

<style>
  .save-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: #111827;
  }

  .save-indicator[data-kind="saving"] .pulse {
    animation: pulse 1s infinite;
    background: #2563eb;
  }

  .save-indicator[data-kind="saved"] .pulse {
    background: #059669;
  }

  .save-indicator[data-kind="error"] {
    color: #b91c1c;
  }

  .save-indicator[data-kind="error"] .pulse {
    background: #b91c1c;
  }

  .pulse {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: #6b7280;
  }

  @keyframes pulse {
    0% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.4;
    }
  }

  .timestamp {
    color: #6b7280;
    font-size: 0.75rem;
  }

  .tooltip-trigger {
    font-size: 0.85rem;
    color: #6b7280;
    cursor: help;
  }

  .tooltip-trigger:hover,
  .tooltip-trigger:focus {
    color: #2563eb;
  }

  .tooltip-trigger:focus {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
    border-radius: 9999px;
  }
</style>
