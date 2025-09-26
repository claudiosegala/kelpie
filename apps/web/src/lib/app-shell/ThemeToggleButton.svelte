<svelte:options runes={false} />

<script lang="ts">
  import { theme, toggleTheme } from "$lib/stores/theme";

  function nextThemeLabel(): string {
    return $theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  }
</script>

<button
  type="button"
  class="btn btn-circle btn-sm border border-base-300/60 bg-base-100/80 text-base-content shadow-sm sm:btn-md hover:border-primary/40"
  on:click={toggleTheme}
  aria-label={nextThemeLabel()}
  title={nextThemeLabel()}
>
  {#if $theme === "light"}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4">
      <circle cx="12" cy="12" r="4" stroke-width="1.5" />
      <path
        stroke-width="1.5"
        d="M12 2.75v2.5m0 13.5v2.5M4.75 12h-2.5m19.5 0h-2.5M6.3 6.3l-1.77-1.77m14.94 14.94-1.77-1.77m0-11.4 1.77-1.77M6.3 17.7l-1.77 1.77"
      />
    </svg>
  {:else}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-4 w-4">
      <path stroke-width="1.5" d="M19.28 15.56A8 8 0 0 1 8.44 4.72 7.25 7.25 0 1 0 19.28 15.56Z" />
    </svg>
  {/if}
</button>
