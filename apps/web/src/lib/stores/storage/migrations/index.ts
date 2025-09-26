import { appendAuditEntries, createAuditEntry } from "../audit";
import { STORAGE_SCHEMA_VERSION } from "../constants";
import { AuditEventType, type IsoDateTimeString, type StorageSnapshot } from "../types";

export type StorageMigration = {
  from: number;
  to: number;
  migrate(snapshot: StorageSnapshot): StorageSnapshot;
};

export type RunMigrationsOptions = {
  migrations?: StorageMigration[];
  now?: () => IsoDateTimeString;
};

const registeredMigrations: StorageMigration[] = [];

/**
 * Expose the internal migrations array so feature modules can register concrete
 * migration steps by importing this module and pushing into the list.
 */
export const storageMigrations = registeredMigrations;

export function registerMigrationForTesting(migration: StorageMigration): () => void {
  storageMigrations.push(migration);
  return () => {
    const index = storageMigrations.indexOf(migration);
    if (index !== -1) {
      storageMigrations.splice(index, 1);
    }
  };
}

export function runMigrations(
  snapshot: StorageSnapshot,
  targetVersion: number = STORAGE_SCHEMA_VERSION,
  options: RunMigrationsOptions = {}
): { snapshot: StorageSnapshot; applied: StorageMigration[] } {
  const availableMigrations = [...(options.migrations ?? storageMigrations)];
  const now = options.now ?? (() => new Date().toISOString());

  const sortedMigrations = availableMigrations.sort((a, b) => {
    if (a.from !== b.from) {
      return a.from - b.from;
    }
    return a.to - b.to;
  });

  const originalVersion = snapshot.meta.version ?? 0;
  if (originalVersion > targetVersion) {
    throw new Error(`storage snapshot version ${originalVersion} is newer than supported version ${targetVersion}`);
  }

  if (originalVersion === targetVersion) {
    return { snapshot, applied: [] };
  }

  let currentSnapshot = snapshot;
  let currentVersion = originalVersion;
  const applied: StorageMigration[] = [];

  while (currentVersion < targetVersion) {
    const nextMigration = sortedMigrations.find((migration) => migration.from === currentVersion);
    if (!nextMigration) {
      throw new Error(`missing migration step from version ${currentVersion} to reach ${targetVersion}`);
    }

    const migrated = nextMigration.migrate(currentSnapshot);
    const nextVersion = migrated.meta.version ?? currentVersion;
    const ensuredVersion = nextVersion === nextMigration.to ? nextVersion : nextMigration.to;

    currentSnapshot = {
      ...migrated,
      meta: {
        ...migrated.meta,
        version: ensuredVersion
      }
    } satisfies StorageSnapshot;

    currentVersion = currentSnapshot.meta.version;
    applied.push(nextMigration);
  }

  if (currentVersion !== targetVersion) {
    throw new Error(`migration chain ended at version ${currentVersion} but expected ${targetVersion}`);
  }

  if (!applied.length) {
    return { snapshot: currentSnapshot, applied };
  }

  const migratedFrom = String(originalVersion);
  const completedAt = now();
  const auditEntry = createAuditEntry(AuditEventType.MigrationCompleted, completedAt, {
    from: originalVersion,
    to: targetVersion,
    steps: applied.map((step) => ({ from: step.from, to: step.to }))
  });

  const finalSnapshot: StorageSnapshot = {
    ...currentSnapshot,
    meta: {
      ...currentSnapshot.meta,
      migratedFrom
    },
    audit: appendAuditEntries(currentSnapshot, auditEntry)
  };

  return { snapshot: finalSnapshot, applied };
}
