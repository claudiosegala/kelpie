<svelte:options runes={false} />

<script lang="ts">
  import { createEventDispatcher } from "svelte";

  import { getDockButtonClasses, type DockButtonTone } from "./dockButtonClasses";

  export let id: string;
  export let label: string;
  export let tone: DockButtonTone = "primary";
  export let isActive = false;
  export let isDisabled = false;
  export let ariaLabel: string | undefined = undefined;
  export let title: string | undefined = undefined;

  const dispatch = createEventDispatcher<{ select: string }>();

  function handleClick() {
    dispatch("select", id);
  }
</script>

<button
  type="button"
  class={getDockButtonClasses({ tone, isActive, disabled: isDisabled })}
  disabled={isDisabled}
  aria-pressed={isActive}
  aria-label={ariaLabel ?? label}
  title={title ?? label}
  on:click={handleClick}
  {...$$restProps}
>
  <slot />
</button>
