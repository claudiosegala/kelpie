<svelte:options runes={false} />

<script lang="ts">
  export type DebounceOption = 125 | 250 | 500 | 750 | 1000;

  export interface ShellSettings {
    debounceMs: DebounceOption;
    theme: string;
  }

  export let settings: ShellSettings = {
    debounceMs: 300 as DebounceOption,
    theme: "light"
  };
</script>

<section class="settings-panel">
  <header>
    <h2>⚙️ App Settings</h2>
    <p class="hint">Future work: connect to shell store + DaisyUI themes.</p>
  </header>

  <div class="form-grid">
    <fieldset>
      <label for="debounce">Preview debounce</label>
      <select id="debounce" disabled>
        <option value={settings.debounceMs}>{settings.debounceMs}ms</option>
      </select>
      <small>Hook up to preview pipeline in a follow-up task.</small>
    </fieldset>

    <fieldset>
      <label for="theme">Theme</label>
      <input id="theme" type="text" value={settings.theme} disabled />
      <small>DaisyUI theme picker to be implemented.</small>
    </fieldset>
  </div>
</section>

<style>
  .settings-panel {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: #f1f5f9;
    height: 100%;
  }

  header {
    border-bottom: 1px solid #cbd5f5;
    padding-bottom: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .hint {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: #475569;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  fieldset {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    border: 1px dashed #94a3b8;
    border-radius: 0.75rem;
    padding: 0.75rem;
    background: #ffffff;
  }

  label {
    font-weight: 600;
    color: #1e293b;
  }

  select,
  input {
    padding: 0.5rem 0.65rem;
    border-radius: 0.5rem;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    color: #334155;
  }

  small {
    color: #64748b;
    font-size: 0.75rem;
  }
</style>
