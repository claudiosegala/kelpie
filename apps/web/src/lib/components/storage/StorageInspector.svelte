<svelte:options runes={false} />

<script lang="ts">
  import { derived } from "svelte/store";
  import { storage } from "$lib/stores/storage/instance";
  import type { AuditEntry, DocumentSnapshot } from "$lib/stores/storage";

  const snapshotStore = storage.snapshot;

  type InspectorMetrics = {
    totalDocuments: number;
    activeDocuments: number;
    softDeletedDocuments: number;
    historyEntries: number;
    auditEntries: number;
    approxSizeBytes: number;
    quotaWarningBytes: number;
    quotaHardBytes: number;
  };

  const metricsStore = derived(snapshotStore, ($snapshot): InspectorMetrics => {
    const totalDocuments = Object.keys($snapshot.documents).length;
    const activeDocuments = $snapshot.index.filter((entry) => entry.deletedAt === null).length;
    const softDeletedDocuments = $snapshot.index.length - activeDocuments;
    return {
      totalDocuments,
      activeDocuments,
      softDeletedDocuments,
      historyEntries: $snapshot.history.length,
      auditEntries: $snapshot.audit.length,
      approxSizeBytes: $snapshot.meta.approxSizeBytes ?? 0,
      quotaWarningBytes: $snapshot.config.quotaWarningBytes,
      quotaHardBytes: $snapshot.config.quotaHardLimitBytes
    } satisfies InspectorMetrics;
  });

  let documentQuery = "";
  let auditQuery = "";

  function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** exponent;
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
  }

  function matchesDocument(document: DocumentSnapshot, query: string): boolean {
    if (!query) return true;
    const normalised = query.toLowerCase();
    return document.id.toLowerCase().includes(normalised) || document.title.toLowerCase().includes(normalised);
  }

  function matchesAudit(entry: AuditEntry, query: string): boolean {
    if (!query) return true;
    const normalised = query.toLowerCase();
    return (
      entry.type.toLowerCase().includes(normalised) ||
      (entry.metadata != null && JSON.stringify(entry.metadata).toLowerCase().includes(normalised))
    );
  }

  function resetStorage(): void {
    storage.reset();
  }

  function simulateFirstRun(): void {
    storage.simulateFirstRun();
  }

  function runGarbageCollection(): void {
    storage.runGarbageCollection();
  }
</script>

<section class="rounded-2xl border border-base-300/70 bg-base-100/70">
  <header
    class="flex flex-col gap-3 border-b border-base-300/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
  >
    <div>
      <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-base-content/70">Storage Inspector</h3>
      <p class="text-xs text-base-content/60">Inspect the persisted snapshot, audit log, and history buffers.</p>
    </div>
    <div class="flex flex-wrap items-center gap-2 text-xs">
      <button class="btn btn-xs rounded-lg border-base-300/70 bg-base-200/70 text-base-content" on:click={resetStorage}>
        Reset storage
      </button>
      <button
        class="btn btn-xs rounded-lg border-base-300/70 bg-base-200/70 text-base-content"
        on:click={simulateFirstRun}
      >
        Simulate first run
      </button>
      <button
        class="btn btn-xs rounded-lg border-base-300/70 bg-base-200/70 text-base-content"
        on:click={runGarbageCollection}
      >
        Run garbage collection
      </button>
    </div>
  </header>

  <div class="flex flex-col gap-6 px-6 py-5">
    <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-xl border border-base-300/60 bg-base-100 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.15em] text-base-content/60">Documents</p>
        <p class="mt-1 text-lg font-semibold text-base-content">
          {$metricsStore.activeDocuments}/{$metricsStore.totalDocuments}
          <span class="text-xs font-normal text-base-content/60"> active</span>
        </p>
      </div>
      <div class="rounded-xl border border-base-300/60 bg-base-100 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.15em] text-base-content/60">Soft deleted</p>
        <p class="mt-1 text-lg font-semibold text-base-content">{$metricsStore.softDeletedDocuments}</p>
      </div>
      <div class="rounded-xl border border-base-300/60 bg-base-100 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.15em] text-base-content/60">History entries</p>
        <p class="mt-1 text-lg font-semibold text-base-content">{$metricsStore.historyEntries}</p>
      </div>
      <div class="rounded-xl border border-base-300/60 bg-base-100 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.15em] text-base-content/60">Audit entries</p>
        <p class="mt-1 text-lg font-semibold text-base-content">{$metricsStore.auditEntries}</p>
      </div>
      <div class="rounded-xl border border-base-300/60 bg-base-100 px-4 py-3 sm:col-span-2 lg:col-span-1">
        <p class="text-xs font-semibold uppercase tracking-[0.15em] text-base-content/60">Approx. size</p>
        <p class="mt-1 text-lg font-semibold text-base-content">{formatBytes($metricsStore.approxSizeBytes)}</p>
        <p class="mt-1 text-xs text-base-content/60">
          Warning
          {$metricsStore.quotaWarningBytes ? formatBytes($metricsStore.quotaWarningBytes) : "n/a"}, hard limit
          {$metricsStore.quotaHardBytes ? ` ${formatBytes($metricsStore.quotaHardBytes)}` : " n/a"}
        </p>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <div class="flex h-64 flex-col overflow-hidden rounded-xl border border-base-300/60 bg-base-100">
        <header class="flex items-center justify-between border-b border-base-300/60 px-4 py-2">
          <h4 class="text-xs font-semibold uppercase tracking-[0.15em] text-base-content/60">Documents</h4>
          <input
            type="search"
            placeholder="Filter by id or title…"
            bind:value={documentQuery}
            class="input input-xs w-40 rounded-lg border-base-300/70 bg-base-200/60 text-xs"
          />
        </header>
        {#if $snapshotStore.index.length === 0}
          <p class="px-4 py-3 text-xs text-base-content/60">No documents persisted yet.</p>
        {:else}
          <ul class="flex-1 space-y-1 overflow-y-auto px-4 py-3 text-xs">
            {#each $snapshotStore.index
              .map((entry) => $snapshotStore.documents[entry.id])
              .filter((doc): doc is DocumentSnapshot => doc !== undefined && matchesDocument(doc, documentQuery))
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) as document (document.id)}
              <li class="rounded-lg border border-base-300/50 bg-base-200/40 px-3 py-2">
                <p class="font-semibold text-base-content">{document.title || "Untitled"}</p>
                <p class="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-base-content/50">{document.id}</p>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="flex h-64 flex-col overflow-hidden rounded-xl border border-base-300/60 bg-base-100">
        <header class="flex items-center justify-between border-b border-base-300/60 px-4 py-2">
          <h4 class="text-xs font-semibold uppercase tracking-[0.15em] text-base-content/60">Audit log</h4>
          <input
            type="search"
            placeholder="Filter by type…"
            bind:value={auditQuery}
            class="input input-xs w-40 rounded-lg border-base-300/70 bg-base-200/60 text-xs"
          />
        </header>
        {#if $snapshotStore.audit.length === 0}
          <p class="px-4 py-3 text-xs text-base-content/60">Auditing disabled or no entries recorded.</p>
        {:else}
          <ul class="flex-1 space-y-1 overflow-y-auto px-4 py-3 text-xs">
            {#each $snapshotStore.audit
              .filter((entry) => matchesAudit(entry, auditQuery))
              .slice()
              .reverse() as entry (entry.id)}
              <li class="rounded-lg border border-base-300/50 bg-base-200/40 px-3 py-2">
                <p class="font-semibold text-base-content">{entry.type}</p>
                <p class="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-base-content/50">{entry.createdAt}</p>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>
  </div>
</section>
