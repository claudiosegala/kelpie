import { STORAGE_KEY_ROOT } from "./constants";
import type { StorageDriver } from "./driver";
import type { StorageBroadcast } from "./types";

const BROADCAST_CHANNEL_NAME = "kelpie.storage.broadcast";
const BROADCAST_STORAGE_KEY = `${STORAGE_KEY_ROOT}.broadcast`;

let broadcastChannel: BroadcastChannel | null = null;
let broadcastChannelBroken = false;
let pendingBroadcast: ReturnType<typeof setTimeout> | null = null;
let queuedBroadcast: StorageBroadcast | null = null;
let broadcastSequence = 0;

type ImportMetaWithEnv = ImportMeta & {
  env?: {
    MODE?: string;
    NODE_ENV?: string;
  };
};

function getRuntimeMode(): string | undefined {
  const metaEnv = (import.meta as ImportMetaWithEnv | undefined)?.env;
  if (metaEnv?.MODE) {
    return metaEnv.MODE;
  }

  if (metaEnv?.NODE_ENV) {
    return metaEnv.NODE_ENV;
  }

  if (typeof process !== "undefined" && typeof process.env?.NODE_ENV === "string") {
    return process.env.NODE_ENV;
  }

  return undefined;
}

function logRecoverableWarning(message: string, error: unknown): void {
  const mode = getRuntimeMode();
  if (mode === "production" || mode === "test") {
    return;
  }

  console.warn(message, error);
}

function resolveBroadcastChannel(): BroadcastChannel | null {
  if (broadcastChannelBroken) {
    return null;
  }

  if (broadcastChannel) {
    return broadcastChannel;
  }

  if (typeof window === "undefined") {
    return null;
  }

  if (!("BroadcastChannel" in window)) {
    broadcastChannelBroken = true;
    return null;
  }

  try {
    broadcastChannel = new window.BroadcastChannel(BROADCAST_CHANNEL_NAME);
    return broadcastChannel;
  } catch (error) {
    logRecoverableWarning("Kelpie storage: failed to initialise BroadcastChannel", error);
    broadcastChannelBroken = true;
    broadcastChannel = null;
    return null;
  }
}

function emitViaBroadcastChannel(broadcast: StorageBroadcast): boolean {
  const channel = resolveBroadcastChannel();
  if (!channel) {
    return false;
  }

  try {
    channel.postMessage(broadcast);
    return true;
  } catch (error) {
    logRecoverableWarning("Kelpie storage: failed to post broadcast message", error);
    try {
      channel.close();
    } catch {
      // no-op if closing fails; we'll fall back to storage events.
    }
    broadcastChannelBroken = true;
    broadcastChannel = null;
    return false;
  }
}

function emitViaStorageEvent(broadcast: StorageBroadcast): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  const payload = {
    ...broadcast,
    __timestamp: Date.now(),
    __sequence: broadcastSequence++
  };

  try {
    localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    logRecoverableWarning("Kelpie storage: failed to write broadcast payload", error);
  }
}

/**
 * Convenience helper for wiring storage broadcasts.
 *
 * Messages are coalesced until the next macrotask and delivered via
 * `BroadcastChannel` when available. Environments without `BroadcastChannel`
 * fall back to emitting a storage event so other tabs can respond.
 */
export function scheduleBroadcast(broadcast: StorageBroadcast, options: { driver?: StorageDriver } = {}): void {
  void options;

  queuedBroadcast = broadcast;

  if (pendingBroadcast) {
    return;
  }

  pendingBroadcast = setTimeout(() => {
    pendingBroadcast = null;
    const next = queuedBroadcast;
    queuedBroadcast = null;

    if (!next) {
      return;
    }

    if (emitViaBroadcastChannel(next)) {
      return;
    }

    emitViaStorageEvent(next);
  }, 0);
}
