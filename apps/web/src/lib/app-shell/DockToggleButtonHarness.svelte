<svelte:options runes={false} />

<script lang="ts">
  import DockToggleButton from "./DockToggleButton.svelte";
  import type { DockButtonTone } from "./dockButtonClasses";

  export let id: string;
  export let label: string;
  export let tone: DockButtonTone = "primary";
  export let isActive = false;
  export let isDisabled = false;
  export let ariaLabel: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let onSelect: (detail: string) => void = () => {};

  function handleSelect(event: CustomEvent<string>) {
    onSelect(event.detail);
  }
</script>

<DockToggleButton
  {id}
  {label}
  {tone}
  {isActive}
  {isDisabled}
  {ariaLabel}
  {title}
  on:select={handleSelect}
  {...$$restProps}
>
  <slot />
</DockToggleButton>
