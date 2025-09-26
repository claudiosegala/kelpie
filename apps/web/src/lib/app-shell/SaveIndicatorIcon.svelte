<svelte:options runes={false} />

<script lang="ts">
  import type { SaveStatus } from "$lib/app-shell/contracts";

  export let kind: SaveStatus["kind"];
  export let toneClass: string;

  $: iconClasses = ["indicator__icon", toneClass, kind === "saving" ? "indicator__icon--saving" : ""]
    .filter(Boolean)
    .join(" ");
</script>

{#if kind === "error"}
  <svg
    class={iconClasses}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3.75 4.5 20.25h15L12 3.75Z"></path>
    <path d="M12 10.5v4.5"></path>
    <path d="M12 17.25h.008"></path>
  </svg>
{:else if kind === "saving"}
  <svg
    class={iconClasses}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle class="opacity-20" cx="12" cy="12" r="8.5"></circle>
    <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" class="opacity-90"></path>
  </svg>
{:else}
  <svg
    class={iconClasses}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="m5.5 12.75 3.75 3.75 9-9"></path>
  </svg>
{/if}

<style lang="postcss">
  .indicator__icon {
    @apply size-4 shrink-0;
  }

  .indicator__icon--saving {
    @apply animate-spin;
  }
</style>
