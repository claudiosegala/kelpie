<script lang="ts">
  import AppShell from "$lib/app-shell/AppShell.svelte";
  import CodeEditorPanel from "$lib/panels/editor/CodeEditorPanel.svelte";
  import InteractivePreviewPanel from "$lib/panels/preview/InteractivePreviewPanel.svelte";
  import AppSettingsPanel from "$lib/panels/settings/AppSettingsPanel.svelte";
  import { appState, setDocumentContent, tasks, toggleTask } from "$lib/stores/state";

  const version = "0.0.0-dev";

  function handleEditorChange(event: CustomEvent<{ value: string }>) {
    setDocumentContent(event.detail.value);
  }

  function handleToggle(event: CustomEvent<{ id: string }>) {
    toggleTask(event.detail.id);
  }
</script>

<AppShell {version}>
  <svelte:fragment slot="editor">
    <CodeEditorPanel value={$appState.file} on:contentChange={handleEditorChange} />
  </svelte:fragment>

  <svelte:fragment slot="preview">
    <InteractivePreviewPanel tasks={$tasks} on:toggleTask={handleToggle} />
  </svelte:fragment>

  <svelte:fragment slot="settings">
    <AppSettingsPanel />
  </svelte:fragment>
</AppShell>
