import { isDebugMode, isStorageInstrumentationEnabled } from "./environment";
import { STORAGE_LOG_PREFIX } from "./logging";

function emitConsoleTable(rows: Record<string, unknown>[]): void {
  if (!rows.length || !isStorageInstrumentationEnabled()) {
    return;
  }

  try {
    console.table(rows);
  } catch {
    // Some environments (e.g., older browsers) may not support console.table.
    // Fall back to console.log to avoid throwing.
    console.log(`${STORAGE_LOG_PREFIX}: instrumentation`, rows);
  }
}

export function logStorageMutation(
  label: string,
  details: { beforeBytes: number; afterBytes: number; metadata?: Record<string, unknown> }
): void {
  if (isDebugMode()) {
    const delta = details.afterBytes - details.beforeBytes;
    const payload = {
      beforeBytes: details.beforeBytes,
      afterBytes: details.afterBytes,
      deltaBytes: delta,
      ...(details.metadata ?? {})
    };
    console.debug(`${STORAGE_LOG_PREFIX}: ${label}`, payload);
  }

  const delta = details.afterBytes - details.beforeBytes;
  emitConsoleTable([
    {
      event: label,
      before: details.beforeBytes,
      after: details.afterBytes,
      delta,
      timestamp: new Date().toISOString(),
      ...(details.metadata ?? {})
    }
  ]);
}

export function recordQuotaWarning(details: { sizeInBytes: number; warningBytes: number }): void {
  emitConsoleTable([
    {
      event: "storage.quota.warning",
      sizeInBytes: details.sizeInBytes,
      warningBytes: details.warningBytes,
      timestamp: new Date().toISOString()
    }
  ]);
}

export function recordCorruption(details: {
  reason: string;
  expectedChecksum?: string;
  actualChecksum?: string;
}): void {
  emitConsoleTable([
    {
      event: "storage.corruption",
      reason: details.reason,
      expectedChecksum: details.expectedChecksum ?? "<unknown>",
      actualChecksum: details.actualChecksum ?? "<unknown>",
      timestamp: new Date().toISOString()
    }
  ]);
}

export function recordMigrationSummary(details: {
  fromVersion: number | null;
  toVersion: number;
  durationMs: number;
  applied: string[];
}): void {
  emitConsoleTable([
    {
      event: "storage.migration",
      fromVersion: details.fromVersion ?? "fresh-install",
      toVersion: details.toVersion,
      durationMs: details.durationMs,
      applied: details.applied.join(", ") || "<none>",
      timestamp: new Date().toISOString()
    }
  ]);
}
