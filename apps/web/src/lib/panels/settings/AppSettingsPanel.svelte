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

<section class="flex h-full flex-col bg-base-200/40">
  <header class="border-b border-base-300/70 px-6 py-5">
    <h2 class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">App Settings</h2>
    <p class="mt-2 max-w-xl text-sm text-base-content/60">
      Future work: connect these controls to the live workspace shell and expose DaisyUI themes.
    </p>
  </header>

  <div class="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6 pt-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <fieldset class="flex flex-col gap-2 rounded-2xl border border-dashed border-base-300/70 bg-base-100/80 p-4">
        <label class="text-sm font-semibold text-base-content" for="debounce">Preview debounce</label>
        <select
          id="debounce"
          class="select select-bordered select-sm rounded-xl border-base-300/70 bg-base-200/70 text-base-content/80"
          disabled
        >
          <option value={settings.debounceMs}>{settings.debounceMs}ms</option>
        </select>
        <small class="text-xs text-base-content/60">Hook up to preview pipeline in a follow-up task.</small>
      </fieldset>

      <fieldset class="flex flex-col gap-2 rounded-2xl border border-dashed border-base-300/70 bg-base-100/80 p-4">
        <label class="text-sm font-semibold text-base-content" for="theme">Theme</label>
        <input
          id="theme"
          class="input input-sm input-bordered rounded-xl border-base-300/70 bg-base-200/70 text-base-content/80"
          type="text"
          value={settings.theme}
          disabled
        />
        <small class="text-xs text-base-content/60">DaisyUI theme picker to be implemented.</small>
      </fieldset>
    </div>
  </div>
</section>
