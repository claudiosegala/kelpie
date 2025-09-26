<svelte:options runes={false} />

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Task } from "$lib/parsing/parseTask";
  import { renderMarkdown } from "$lib/utils/renderMarkdown";

  const dispatch = createEventDispatcher<{ toggleTask: { id: string } }>();

  export let tasks: Task[] = [];
  export let content = "";

  type ViewMode = "tasks" | "markdown";
  let view: ViewMode = "tasks";

  const tabs: Array<{ id: ViewMode; label: string; description: string }> = [
    { id: "tasks", label: "Tasks", description: "View parsed tasks" },
    { id: "markdown", label: "Document", description: "View rendered Markdown" }
  ];

  $: markdownHtml = renderMarkdown(content);
  $: trimmedContent = content.trim();

  function handleToggle(id: string) {
    dispatch("toggleTask", { id });
  }

  function formatTagValue(value: string | string[]): string {
    return Array.isArray(value) ? value.join(", ") : value;
  }

  function getDueLabel(task: Task): string | undefined {
    const due = task.tags.due;
    if (!due) return undefined;
    return formatTagValue(due);
  }

  function getHashtags(task: Task): string[] {
    const hashtags = task.tags.hashtags;
    if (!hashtags) return [];
    return Array.isArray(hashtags) ? hashtags : [hashtags];
  }

  function getOtherTags(task: Task): [string, string][] {
    return Object.entries(task.tags)
      .filter(([key]) => key !== "hashtags" && key !== "due")
      .map(([key, value]) => [key, formatTagValue(value)]);
  }
</script>

<section class="flex h-full flex-col bg-base-200/40">
  <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-300/70 px-6 py-5">
    <h2 class="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">Preview</h2>
    <nav aria-label="Preview mode" class="flex items-center gap-1 rounded-full bg-base-300/50 p-1">
      {#each tabs as tab (tab.id)}
        <button
          type="button"
          class={`rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            view === tab.id ? "bg-base-100 text-base-content shadow" : "text-base-content/60 hover:text-base-content"
          }`}
          aria-pressed={view === tab.id}
          on:click={() => (view = tab.id)}
          aria-label={tab.description}
        >
          {tab.label}
        </button>
      {/each}
    </nav>
  </header>

  {#if view === "tasks"}
    {#if tasks.length === 0}
      <div class="flex flex-1 items-center justify-center px-6">
        <p
          class="rounded-full border border-dashed border-base-300/80 bg-base-100/80 px-6 py-3 text-sm text-base-content/60"
        >
          No tasks parsed yet — start typing in the editor to see them here.
        </p>
      </div>
    {:else}
      <ul class="flex flex-1 flex-col gap-3 overflow-y-auto px-6 pb-6 pt-4">
        {#each tasks as task (task.id)}
          {@const dueLabel = getDueLabel(task)}
          {@const hashtags = getHashtags(task)}
          {@const otherTags = getOtherTags(task)}
          <li
            class="rounded-2xl border border-base-300/70 bg-base-100/70 p-3 shadow-sm transition hover:border-primary/40 hover:bg-base-100"
            data-completed={task.checked}
          >
            <label class="group flex items-start gap-4">
              <span class="relative mt-1 flex h-5 w-5 items-center justify-center">
                <input
                  class="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-full"
                  type="checkbox"
                  checked={task.checked}
                  on:change={() => handleToggle(task.id)}
                  aria-label={`Toggle ${task.title}`}
                />
                <span
                  class="pointer-events-none absolute inset-0 rounded-full border-2 border-base-content/30 bg-base-200/80 transition-all duration-200 peer-checked:border-primary peer-checked:bg-primary/90"
                ></span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="pointer-events-none relative hidden h-3 w-3 text-base-100 peer-checked:block"
                >
                  <path stroke-width="2" d="m5 13 4 4L19 7" />
                </svg>
              </span>

              <div class="flex flex-1 flex-col gap-2">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <p
                    class={`text-base font-semibold leading-snug transition ${
                      task.checked ? "text-base-content/50 line-through" : "text-base-content"
                    }`}
                  >
                    {task.title}
                  </p>
                  {#if hashtags.length > 0}
                    <div class="flex flex-wrap justify-end gap-2">
                      {#each hashtags as tag (tag)}
                        <span
                          class="badge badge-sm border-0 bg-base-300/70 text-[0.65rem] font-semibold uppercase tracking-wide text-base-content/70"
                        >
                          #{tag}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </div>

                <div class="flex flex-wrap items-center gap-2 text-xs text-base-content/70 sm:text-sm">
                  {#if dueLabel}
                    <span class="badge badge-sm border-0 bg-success/20 text-success-content/90">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="mr-1 h-3 w-3"
                      >
                        <circle cx="12" cy="12" r="7" stroke-width="1.5" />
                        <path stroke-width="1.5" d="M12 8v4l2.5 1.5" />
                      </svg>
                      {dueLabel}
                    </span>
                  {/if}

                  {#each otherTags as [key, value] (key)}
                    <span class="badge badge-sm border border-base-300/70 bg-base-100/70 text-base-content/70">
                      <span class="font-semibold capitalize">{key}</span>
                      <span class="ml-1 text-base-content/60">{value}</span>
                    </span>
                  {/each}
                </div>
              </div>
            </label>
          </li>
        {/each}
      </ul>
    {/if}
  {:else if trimmedContent.length === 0}
    <div class="flex flex-1 items-center justify-center px-6">
      <p
        class="rounded-full border border-dashed border-base-300/80 bg-base-100/80 px-6 py-3 text-sm text-base-content/60"
      >
        Nothing to preview yet — start typing in the editor to render the document.
      </p>
    </div>
  {:else}
    <div class="flex flex-1 flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto px-6 pb-6 pt-4">
        <article class="prose prose-sm max-w-none text-base-content/80 dark:prose-invert">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html markdownHtml}
        </article>
      </div>
    </div>
  {/if}
</section>
