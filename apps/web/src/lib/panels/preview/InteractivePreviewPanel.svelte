<svelte:options runes={false} />

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Task } from "$lib/parsing/parseTask";

  const dispatch = createEventDispatcher<{ toggleTask: { id: string } }>();

  export let tasks: Task[] = [];

  function handleToggle(id: string) {
    dispatch("toggleTask", { id });
  }
</script>

<section class="preview-panel">
  <header>
    <h2>✅ Parsed Tasks</h2>
  </header>

  {#if tasks.length === 0}
    <p class="empty">No tasks parsed yet.</p>
  {:else}
    <ul class="task-list">
      {#each tasks as task (task.id)}
        <li class="task-item {task.checked ? 'done' : ''}">
          <label>
            <input type="checkbox" checked={task.checked} on:change={() => handleToggle(task.id)} />
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

<style>
  .preview-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 1rem;
    gap: 0.75rem;
    background: #f8fafc;
  }

  header {
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
  }

  .empty {
    color: #64748b;
    font-style: italic;
  }

  .task-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .task-item {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.75rem;
    transition: background 0.2s ease;
  }

  .task-item.done .title {
    text-decoration: line-through;
    color: #94a3b8;
  }

  label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  input[type="checkbox"] {
    transform: scale(1.1);
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
