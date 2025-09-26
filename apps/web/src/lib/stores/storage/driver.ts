import { getLocalStorage, getWindow } from "./environment";
import { storageWarn } from "./logging";
import { serialiseSnapshot } from "./serialization";
import type { IsoDateTimeString, StorageSnapshot } from "./types";

export type StorageLoadOptions = {
  onCorruption?: (error: StorageCorruptionError) => void;
};

export type CreateLocalStorageDriverOptions = {
  now?: () => IsoDateTimeString;
  backupLimit?: number;
};

export type StorageDriver = {
  load(options?: StorageLoadOptions): StorageSnapshot | null;
  save(snapshot: StorageSnapshot): void;
  clear(): void;
  subscribe(callback: () => void): () => void;
};

export type StorageCorruptionReason = "parse" | "checksum";

export class StorageCorruptionError extends Error {
  readonly reason: StorageCorruptionReason;
  readonly rawPayload: string;
  readonly expectedChecksum?: string;
  readonly actualChecksum?: string;
  readonly details?: unknown;

  constructor(
    reason: StorageCorruptionReason,
    message: string,
    rawPayload: string,
    options: { expectedChecksum?: string; actualChecksum?: string; details?: unknown } = {}
  ) {
    super(message);
    this.name = "StorageCorruptionError";
    this.reason = reason;
    this.rawPayload = rawPayload;
    this.expectedChecksum = options.expectedChecksum;
    this.actualChecksum = options.actualChecksum;
    this.details = options.details;
  }
}

export class StorageDriverQuotaError extends Error {
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super("storage quota exceeded");
    this.name = "StorageQuotaError";
    this.cause = cause;
  }
}

type InternalStorage = Storage & { __kelpieFallback?: boolean };

type MemoryStorageState = {
  map: Map<string, string>;
  order: string[];
};

function createMemoryStorage(): InternalStorage {
  const state: MemoryStorageState = {
    map: new Map(),
    order: []
  };

  const storage: InternalStorage = {
    get length() {
      return state.order.length;
    },
    clear() {
      state.map.clear();
      state.order = [];
    },
    getItem(key: string): string | null {
      if (!state.map.has(key)) {
        return null;
      }
      return state.map.get(key) ?? null;
    },
    key(index: number): string | null {
      return state.order[index] ?? null;
    },
    removeItem(key: string): void {
      if (!state.map.has(key)) {
        return;
      }
      state.map.delete(key);
      state.order = state.order.filter((entry) => entry !== key);
    },
    setItem(key: string, value: string): void {
      if (!state.map.has(key)) {
        state.order.push(key);
      }
      state.map.set(key, value);
    }
  } as InternalStorage;

  storage.__kelpieFallback = true;
  return storage;
}

function computeChecksum(serialised: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialised.length; index += 1) {
    hash ^= serialised.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function sanitiseTimestamp(timestamp: IsoDateTimeString): string {
  return timestamp.replace(/[:.]/g, "-");
}

function collectBackupKeys(storage: Storage, prefix: string): string[] {
  const keys: string[] = [];
  const { length } = storage;
  for (let index = 0; index < length; index += 1) {
    const key = storage.key(index);
    if (!key) {
      continue;
    }
    if (key.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys.sort();
}

function isQuotaError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "QuotaExceededError" || error.code === 22 || error.name === "NS_ERROR_DOM_QUOTA_REACHED";
  }

  if (typeof error === "object" && error && "code" in error && (error as { code?: number }).code === 22) {
    return true;
  }

  return false;
}

export function createLocalStorageDriver(key: string, options: CreateLocalStorageDriverOptions = {}): StorageDriver {
  const now = options.now ?? (() => new Date().toISOString());
  const backupLimit = Math.max(0, options.backupLimit ?? 3);
  const localStorageInstance = getLocalStorage();
  const storage: InternalStorage = (localStorageInstance ?? createMemoryStorage()) as InternalStorage;
  const useFallback = !!storage.__kelpieFallback;
  const checksumKey = `${key}.checksum`;
  const backupPrefix = `${key}.backup.`;
  const fallbackSubscribers = new Set<() => void>();

  let lastSerialised: string | null = null;
  let lastChecksum: string | null = null;

  function notifyFallbackSubscribers(): void {
    if (!useFallback) {
      return;
    }
    for (const listener of fallbackSubscribers) {
      try {
        listener();
      } catch (error) {
        storageWarn("storage fallback subscriber threw", error);
      }
    }
  }

  function writeBackup(raw: string): void {
    if (backupLimit === 0) {
      return;
    }

    const timestamp = sanitiseTimestamp(now());
    const backupKey = `${backupPrefix}${timestamp}`;

    try {
      storage.setItem(backupKey, raw);
    } catch (error) {
      storageWarn("failed to persist storage backup", error);
      return;
    }

    const backupKeys = collectBackupKeys(storage, backupPrefix);
    if (backupKeys.length <= backupLimit) {
      return;
    }

    const excess = backupKeys.length - backupLimit;
    for (let index = 0; index < excess; index += 1) {
      const keyToRemove = backupKeys[index];
      if (!keyToRemove) {
        continue;
      }
      try {
        storage.removeItem(keyToRemove);
      } catch (error) {
        storageWarn("failed to prune storage backup", error);
      }
    }
  }

  function handleCorruption(error: StorageCorruptionError, callback?: StorageLoadOptions["onCorruption"]): void {
    storageWarn(`storage snapshot corruption detected (${error.reason})`, error.details ?? error);
    writeBackup(error.rawPayload);
    callback?.(error);
  }

  return {
    load(loadOptions) {
      const raw = storage.getItem(key);
      if (!raw) {
        lastSerialised = null;
        lastChecksum = null;
        return null;
      }

      const expectedChecksum = storage.getItem(checksumKey);
      const actualChecksum = computeChecksum(raw);

      if (expectedChecksum && expectedChecksum !== actualChecksum) {
        handleCorruption(
          new StorageCorruptionError("checksum", "storage snapshot checksum mismatch", raw, {
            expectedChecksum,
            actualChecksum
          }),
          loadOptions?.onCorruption
        );
        return null;
      }

      try {
        const parsed = JSON.parse(raw) as StorageSnapshot;
        lastSerialised = raw;
        lastChecksum = actualChecksum;
        return parsed;
      } catch (error) {
        handleCorruption(
          new StorageCorruptionError("parse", "failed to parse storage snapshot", raw, { details: error }),
          loadOptions?.onCorruption
        );
        return null;
      }
    },
    save(snapshot) {
      const serialised = serialiseSnapshot(snapshot);
      const checksum = computeChecksum(serialised);

      if (lastSerialised === serialised && lastChecksum === checksum) {
        return;
      }

      const previous = storage.getItem(key);
      if (previous && previous !== serialised) {
        writeBackup(previous);
      }

      try {
        storage.setItem(key, serialised);
        storage.setItem(checksumKey, checksum);
      } catch (error) {
        if (isQuotaError(error)) {
          throw new StorageDriverQuotaError(error);
        }
        throw error;
      }

      lastSerialised = serialised;
      lastChecksum = checksum;

      notifyFallbackSubscribers();
    },
    clear() {
      storage.removeItem(key);
      storage.removeItem(checksumKey);
      lastSerialised = null;
      lastChecksum = null;
      notifyFallbackSubscribers();
    },
    subscribe(callback) {
      const host = getWindow();
      let unsubscribeFallback = () => {};

      if (useFallback) {
        fallbackSubscribers.add(callback);
        unsubscribeFallback = () => {
          fallbackSubscribers.delete(callback);
        };
      }

      if (!host) {
        return unsubscribeFallback;
      }

      const handler = (event: StorageEvent) => {
        if (event.key === key) {
          callback();
        }
      };

      host.addEventListener("storage", handler);
      return () => {
        unsubscribeFallback();
        host.removeEventListener("storage", handler);
      };
    }
  } satisfies StorageDriver;
}
