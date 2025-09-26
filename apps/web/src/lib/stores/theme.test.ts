import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const THEME_STORAGE_KEY = "kelpie-theme";

describe("theme store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("$app/environment");
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to light and avoids DOM writes on the server", async () => {
    vi.doMock("$app/environment", () => ({ browser: false }));

    const setAttributeSpy = vi.spyOn(document.documentElement, "setAttribute");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const { theme, toggleTheme } = await import("./theme");

    expect(get(theme)).toBe("light");
    expect(setAttributeSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();

    toggleTheme();
    expect(get(theme)).toBe("dark");
    expect(setAttributeSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();

    setAttributeSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it("hydrates from storage and persists changes in the browser", async () => {
    vi.doMock("$app/environment", () => ({ browser: true }));
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    const setAttributeSpy = vi.spyOn(document.documentElement, "setAttribute");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const { theme, toggleTheme } = await import("./theme");

    expect(get(theme)).toBe("dark");
    expect(setAttributeSpy).toHaveBeenCalledWith("data-theme", "dark");
    expect(setItemSpy).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark");

    toggleTheme();

    expect(get(theme)).toBe("light");
    expect(setAttributeSpy).toHaveBeenLastCalledWith("data-theme", "light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    setAttributeSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it("falls back to light when the stored value is invalid", async () => {
    vi.doMock("$app/environment", () => ({ browser: true }));
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");

    const { theme } = await import("./theme");

    expect(get(theme)).toBe("light");
  });
});
