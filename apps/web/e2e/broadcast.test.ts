import { expect, test } from "@playwright/test";

test.describe("storage broadcast propagation", () => {
  test("delivers payloads through BroadcastChannel", async ({ browser }) => {
    const context = await browser.newContext();

    try {
      const sender = await context.newPage();
      const receiver = await context.newPage();

      await sender.goto("/");
      await receiver.goto("/");

      await sender.evaluate(() => localStorage.clear());
      await receiver.evaluate(() => localStorage.clear());
      await sender.reload();
      await receiver.reload();

      const messagePromise = receiver.evaluate(() => {
        return new Promise<unknown>((resolve) => {
          const channel = new BroadcastChannel("kelpie.storage.broadcast");
          channel.onmessage = (event) => {
            resolve(event.data);
            channel.close();
          };
        });
      });

      await sender.evaluate(async () => {
        const { scheduleBroadcast } = await import("/src/lib/stores/storage/engine.ts");
        scheduleBroadcast({
          scope: "settings",
          updatedAt: "2024-02-01T00:00:00.000Z",
          origin: "local"
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const payload = (await messagePromise) as Record<string, unknown>;

      expect(payload).toMatchObject({
        scope: "settings",
        updatedAt: "2024-02-01T00:00:00.000Z",
        origin: "local"
      });
    } finally {
      await context.close();
    }
  });

  test("falls back to storage events when BroadcastChannel is unavailable", async ({ browser }) => {
    const context = await browser.newContext();

    try {
      const sender = await context.newPage();
      await sender.addInitScript(() => {
        Object.defineProperty(window, "BroadcastChannel", {
          configurable: true,
          writable: true,
          value: undefined
        });
      });
      const receiver = await context.newPage();

      await sender.goto("/");
      await receiver.goto("/");

      await sender.evaluate(() => localStorage.clear());
      await receiver.evaluate(() => localStorage.clear());
      await sender.reload();
      await receiver.reload();

      const storagePromise = receiver.evaluate(() => {
        return new Promise<string | null>((resolve) => {
          window.addEventListener(
            "storage",
            (event) => {
              if (event.key === "kelpie.storage.broadcast") {
                resolve(event.newValue);
              }
            },
            { once: true }
          );
        });
      });

      await sender.evaluate(async () => {
        const { scheduleBroadcast } = await import("/src/lib/stores/storage/engine.ts");
        scheduleBroadcast({
          scope: "history",
          updatedAt: "2024-02-02T00:00:00.000Z",
          origin: "local"
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const raw = await storagePromise;
      expect(raw).toBeTruthy();

      const payload = JSON.parse(raw ?? "{}");
      expect(payload.scope).toBe("history");
      expect(payload.updatedAt).toBe("2024-02-02T00:00:00.000Z");
      expect(payload.origin).toBe("local");
      expect(payload.__timestamp).toEqual(expect.any(Number));
      expect(payload.__sequence).toEqual(expect.any(Number));
    } finally {
      await context.close();
    }
  });
});
