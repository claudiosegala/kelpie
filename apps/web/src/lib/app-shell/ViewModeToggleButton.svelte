<svelte:options runes={false} />

<script lang="ts">
  import type { ViewMode } from "./contracts";
  import { setViewMode, shellState } from "$lib/stores/shell";

  const viewOptions: { id: ViewMode; label: string }[] = [
    { id: "editor-preview", label: "Editor & preview" },
    { id: "preview-only", label: "Preview" },
    { id: "settings", label: "Settings" }
  ];

  function handleViewChange(id: ViewMode) {
    setViewMode(id);
  }

  const baseButtonClasses =
    "dock-item btn btn-sm sm:btn-md btn-circle border border-transparent bg-base-100/70 text-base-content/80 shadow-none transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70";

  const activeButtonClasses = "bg-primary text-primary-content shadow-lg shadow-primary/30 ring-2 ring-primary/70";
  const inactiveButtonClasses = "hover:border-base-300 hover:bg-base-200/70 hover:text-base-content";
</script>

<div
  class="dock flex flex-row items-center gap-2 rounded-full border border-base-300/70 bg-base-100/70 px-2 py-1.5 shadow-sm"
  role="group"
  aria-label="Select workspace mode"
>
  {#each viewOptions as option (option.id)}
    <button
      type="button"
      class={`${baseButtonClasses} ${$shellState.viewMode === option.id ? activeButtonClasses : inactiveButtonClasses}`}
      on:click={() => handleViewChange(option.id)}
      aria-pressed={$shellState.viewMode === option.id}
      aria-label={option.label}
      title={option.label}
      data-testid={`view-mode-${option.id}`}
    >
      {#if option.id === "editor-preview"}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
          <rect x="3.5" y="5.5" width="7" height="13" rx="1.5" stroke-width="1.5" />
          <rect x="13.5" y="5.5" width="7" height="13" rx="1.5" stroke-width="1.5" />
        </svg>
      {:else if option.id === "preview-only"}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
          <path stroke-width="1.5" d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12Z" />
          <circle cx="12" cy="12" r="2.5" stroke-width="1.5" />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5">
          <path
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.89 3.31.877 2.42 2.42a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.89 1.543-.877 3.31-2.42 2.42a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.89-3.31-.877-2.42-2.42a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35A1.724 1.724 0 0 0 4.68 7.803c-.89-1.543.877-3.31 2.42-2.42a1.724 1.724 0 0 0 2.572-1.066Z"
          />
          <path
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      {/if}
    </button>
  {/each}
</div>
