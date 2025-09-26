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

<section class="editor-panel">
    <header>
        <h2>✏️ Markdown Source</h2>
    </header>
    <textarea
        aria-label="Markdown editor"
        bind:value={draft}
        placeholder={placeholder}
        on:input={handleInput}
        on:focus={handleFocus}
        on:blur={handleBlur}
    ></textarea>
</section>

<style>
    .editor-panel {
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 1rem;
        gap: 0.75rem;
        background: #f9fafb;
    }

    header {
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.5rem;
    }

    h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
    }

    textarea {
        flex: 1;
        resize: none;
        width: 100%;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        padding: 0.75rem;
        font-family: var(--editor-font, monospace);
        font-size: 0.95rem;
        line-height: 1.5;
        background: #ffffff;
        color: #1f2937;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
    }
</style>
