import { STORAGE_KEY_ROOT } from "./constants";
import { getLocalStorage, getWindow } from "./environment";
import type { StorageDriver } from "./driver";
import type { StorageBroadcast } from "./types";

const BROADCAST_CHANNEL_NAME = "kelpie.storage.broadcast";
const BROADCAST_STORAGE_KEY = `${STORAGE_KEY_ROOT}.broadcast`;

let broadcastChannel: BroadcastChannel | null = null;
let broadcastChannelBroken = false;
let pendingBroadcast: ReturnType<typeof setTimeout> | null = null;
let queuedBroadcast: StorageBroadcast | null = null;
let broadcastSequence = 0;

function resolveBroadcastChannel(): BroadcastChannel | null {
  if (broadcastChannelBroken) {
    return null;
  }

  if (broadcastChannel) {
    return broadcastChannel;
  }

  const host = getWindow();
  if (!host) {
    return null;
  }

  if (!("BroadcastChannel" in host)) {
    broadcastChannelBroken = true;
    return null;
  }

  try {
    const ChannelCtor = host.BroadcastChannel;
    if (!ChannelCtor) {
      broadcastChannelBroken = true;
      return null;
    }
    broadcastChannel = new ChannelCtor(BROADCAST_CHANNEL_NAME);
    return broadcastChannel;
  } catch (error) {
    console.warn("Kelpie storage: failed to initialise BroadcastChannel", error);
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
    console.warn("Kelpie storage: failed to post broadcast message", error);
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
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  const payload = {
    ...broadcast,
    __timestamp: Date.now(),
    __sequence: broadcastSequence++
  };

  try {
    storage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Kelpie storage: failed to write broadcast payload", error);
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
