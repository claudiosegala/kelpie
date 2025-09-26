<svelte:options runes={false} />

<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher<{
    contentChange: { value: string };
    editingState: { isEditing: boolean };
  }>();

  export let value = "";
  export let placeholder = "- [ ] Example task @due(2025-10-01) #tag";

  let draft = value;
  let isEditing = false;

  $: if (!isEditing && value !== draft) {
    draft = value;
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    draft = target.value;
    dispatch("contentChange", { value: draft });
  }

  function handleFocus() {
    isEditing = true;
    dispatch("editingState", { isEditing: true });
  }

  function handleBlur() {
    isEditing = false;
    dispatch("editingState", { isEditing: false });
  }
</script>

<section class="flex h-full flex-col bg-base-200/40">
  <header class="flex items-center justify-between border-b border-base-300/70 px-6 py-5">
    <div class="tooltip tooltip-bottom" data-tip="Supports Markdown input with GitHub Flavored Markdown extensions.">
      <h2 class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">Code Editor</h2>
    </div>
  </header>
  <div class="flex flex-1 flex-col px-6 pb-6 pt-4">
    <textarea
      aria-label="Markdown editor"
      bind:value={draft}
      class="h-full w-full flex-1 resize-none rounded-2xl border border-base-300/70 bg-base-200/80 p-5 font-mono text-sm text-base-content/80 shadow-inner outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/25"
      {placeholder}
      on:input={handleInput}
      on:focus={handleFocus}
      on:blur={handleBlur}
    ></textarea>
  </div>
</section>
