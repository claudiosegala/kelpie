<svelte:options runes={false} />

<script lang="ts">
  import CodeEditorPanel from "./CodeEditorPanel.svelte";

  export let value = "";
  export let placeholder = "- [ ] Example task @due(2025-10-01) #tag";
  export let onContentChange: (detail: { value: string }) => void = () => {};
  export let onEditingState: (detail: { isEditing: boolean }) => void = () => {};

  function handleContentChange(event: CustomEvent<{ value: string }>) {
    onContentChange(event.detail);
  }

  function handleEditingState(event: CustomEvent<{ isEditing: boolean }>) {
    onEditingState(event.detail);
  }
</script>

<CodeEditorPanel {value} {placeholder} on:contentChange={handleContentChange} on:editingState={handleEditingState} />
