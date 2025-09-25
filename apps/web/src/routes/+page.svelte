<script lang="ts">
    import { appState, tasks, toggleTask } from "$lib/stores/state";
    import type { Task } from "$lib/parsing/parseTask";

    function onToggle(task: Task) {
        toggleTask(task.id);
    }
</script>

<div class="page">
    <!-- Left column: Markdown editor -->
    <section class="editor">
        <header>
            <h2>✏️ Markdown Source</h2>
        </header>
        <textarea bind:value={$appState.file} placeholder="- [ ] Example task @due(2025-10-01) #tag"></textarea>
    </section>

    <!-- Right column: Parsed preview -->
    <section class="preview">
        <header>
            <h2>✅ Parsed Tasks</h2>
        </header>
        {#if $tasks.length === 0}
            <p class="empty">No tasks parsed yet.</p>
        {:else}
            <ul class="task-list">
                {#each $tasks as task (task.id)}
                    <li class="task-item {task.checked ? 'done' : ''}">
                        <label>
                            <input type="checkbox" checked={task.checked} onchange={() => onToggle(task)} />
                            <span class="title">{task.title}</span>
                            {#if Object.keys(task.tags).length > 0}
                                <span class="tags">
                                    {#each Object.entries(task.tags) as [k, v] (k)}
                                        <span class="tag">
                                            {k}: {Array.isArray(v) ? v.join(",") : v}
                                        </span>
                                    {/each}
                                </span>
                            {/if}
                        </label>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>
</div>

<style>
    /* Layout */
    .page {
        display: grid;
        grid-template-columns: 1fr 1fr;
        height: 100vh;
        overflow: hidden;
        background: #f9fafb;
        font-family: system-ui, sans-serif;
        color: #1f2937;
    }

    section {
        display: flex;
        flex-direction: column;
        padding: 1rem;
        border-right: 1px solid #e5e7eb;
    }

    section:last-child {
        border-right: none;
    }

    header {
        margin-bottom: 0.75rem;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.5rem;
    }

    h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #111827;
    }

    /* Editor */
    textarea {
        flex: 1;
        resize: none;
        width: 100%;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        padding: 0.75rem;
        font-family: monospace;
        font-size: 0.9rem;
        line-height: 1.4;
        background: #fff;
        color: #111827;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    /* Preview */
    .empty {
        color: #6b7280;
        font-style: italic;
    }

    .task-list {
        list-style: none;
        padding: 0;
        margin: 0;
        overflow-y: auto;
        flex: 1;
    }

    .task-item {
        padding: 0.5rem 0.75rem;
        margin-bottom: 0.25rem;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        transition: background 0.2s ease;
    }

    .task-item:hover {
        background: #f3f4f6;
    }

    .task-item.done .title {
        text-decoration: line-through;
        color: #9ca3af;
    }

    label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    input[type="checkbox"] {
        transform: scale(1.2);
    }

    .title {
        flex: 1;
    }

    .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
    }

    .tag {
        background: #eef2ff;
        border: 1px solid #c7d2fe;
        color: #3730a3;
        font-size: 0.7rem;
        padding: 0.15rem 0.4rem;
        border-radius: 0.25rem;
    }
</style>
