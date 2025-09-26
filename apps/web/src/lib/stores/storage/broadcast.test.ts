import { afterEach, describe, expect, it, vi } from "vitest";
import { StorageBroadcastOrigin, StorageBroadcastScope, type StorageBroadcast } from "./types";

const sampleBroadcast: StorageBroadcast = {
  scope: StorageBroadcastScope.Settings,
  updatedAt: "2024-01-01T00:00:00.000Z",
  origin: StorageBroadcastOrigin.Local
};

function createStorageMock() {
  return {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0
  } satisfies Storage;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("scheduleBroadcast", () => {
  it("posts messages via BroadcastChannel when available", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const postMessage = vi.fn();
    const close = vi.fn();

    class FakeBroadcastChannel {
      name: string;

      constructor(name: string) {
        this.name = name;
      }

      postMessage(payload: unknown) {
        postMessage(payload);
      }

      close() {
        close();
      }
    }

    const storage = createStorageMock();

    vi.stubGlobal("window", {
      BroadcastChannel: FakeBroadcastChannel
    } as unknown as Window & typeof globalThis);
    vi.stubGlobal("localStorage", storage);

    const { scheduleBroadcast } = await import("./broadcast");

    scheduleBroadcast(sampleBroadcast);
    vi.runOnlyPendingTimers();

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(sampleBroadcast);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it("coalesces multiple calls within the same macrotask", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const postMessage = vi.fn();

    class FakeBroadcastChannel {
      name: string;

      constructor(name: string) {
        this.name = name;
      }

      postMessage(payload: unknown) {
        postMessage(payload);
      }

      close() {}
    }

    const storage = createStorageMock();

    vi.stubGlobal("window", {
      BroadcastChannel: FakeBroadcastChannel
    } as unknown as Window & typeof globalThis);
    vi.stubGlobal("localStorage", storage);

    const { scheduleBroadcast } = await import("./broadcast");

    const first: StorageBroadcast = {
      scope: StorageBroadcastScope.Config,
      updatedAt: "2024-01-02T00:00:00.000Z",
      origin: StorageBroadcastOrigin.Local
    };

    const second: StorageBroadcast = {
      scope: StorageBroadcastScope.Documents,
      updatedAt: "2024-01-03T00:00:00.000Z",
      origin: StorageBroadcastOrigin.External
    };

    scheduleBroadcast(first);
    scheduleBroadcast(second);
    vi.runOnlyPendingTimers();

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(second);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("falls back to emitting storage events when BroadcastChannel is unavailable", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const storage = createStorageMock();

    vi.stubGlobal("window", {} as Window & typeof globalThis);
    vi.stubGlobal("localStorage", storage);

    const { scheduleBroadcast } = await import("./broadcast");

    scheduleBroadcast(sampleBroadcast);
    vi.runOnlyPendingTimers();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const [key, raw] = storage.setItem.mock.calls[0]!;
    expect(key).toBe("kelpie.storage.broadcast");

    const parsed = JSON.parse(raw as string);
    expect(parsed.scope).toBe(sampleBroadcast.scope);
    expect(parsed.origin).toBe(sampleBroadcast.origin);
    expect(parsed.updatedAt).toBe(sampleBroadcast.updatedAt);
    expect(parsed.__timestamp).toEqual(expect.any(Number));
    expect(parsed.__sequence).toBe(0);
  });

  it("recovers from BroadcastChannel failures by falling back to storage events", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const storage = createStorageMock();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const postMessageSpy = vi.fn(() => {
      throw new Error("post failed");
    });
    const close = vi.fn();

    class FaultyBroadcastChannel {
      name: string;

      constructor(name: string) {
        this.name = name;
      }

      postMessage(payload: unknown) {
        postMessageSpy(payload);
        throw new Error("post failed");
      }

      close() {
        close();
      }
    }

    vi.stubGlobal("window", {
      BroadcastChannel: FaultyBroadcastChannel
    } as unknown as Window & typeof globalThis);
    vi.stubGlobal("localStorage", storage);

    const { scheduleBroadcast } = await import("./broadcast");

    scheduleBroadcast(sampleBroadcast);
    vi.runOnlyPendingTimers();

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("Kelpie storage: failed to post broadcast message", expect.any(Error));

    const followUp: StorageBroadcast = {
      scope: StorageBroadcastScope.History,
      updatedAt: "2024-01-04T00:00:00.000Z",
      origin: StorageBroadcastOrigin.Local
    };

    scheduleBroadcast(followUp);
    vi.runOnlyPendingTimers();

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    const [, secondRaw] = storage.setItem.mock.calls[1]!;
    const parsed = JSON.parse(secondRaw as string);
    expect(parsed.scope).toBe(followUp.scope);
    expect(parsed.__sequence).toBe(1);

    warnSpy.mockRestore();
  });
});
