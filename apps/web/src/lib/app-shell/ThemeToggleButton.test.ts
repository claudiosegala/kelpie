import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const themeMocks = vi.hoisted(() => {
  const Theme = {
    Light: "light",
    Dark: "dark"
  } as const;

  type ThemeName = (typeof Theme)[keyof typeof Theme];

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable } = require("svelte/store") as typeof import("svelte/store");
  const theme = writable<ThemeName>(Theme.Light);
  const toggleTheme = vi.fn(() => theme.update((value) => (value === Theme.Light ? Theme.Dark : Theme.Light)));
  return { theme, toggleTheme, Theme };
});

vi.mock("$lib/stores/theme", () => themeMocks);

import ThemeToggleButton from "./ThemeToggleButton.svelte";
import { Theme as StoreTheme, theme, toggleTheme } from "$lib/stores/theme";

const toggleThemeMock = toggleTheme as ReturnType<typeof vi.fn>;

describe("ThemeToggleButton", () => {
  beforeEach(async () => {
    toggleThemeMock.mockClear();
    theme.set(StoreTheme.Light);
    await tick();
  });

  afterEach(async () => {
    theme.set(StoreTheme.Light);
    await tick();
  });

  it("labels the control based on the currently active theme", () => {
    render(ThemeToggleButton);

    const button = screen.getByRole("button", { name: "Switch to dark theme" });
    expect(button).toBeInTheDocument();
    expect(get(theme)).toBe(StoreTheme.Light);
  });

  it("invokes the toggle handler when clicked", async () => {
    const user = userEvent.setup();
    render(ThemeToggleButton);

    const button = screen.getByRole("button", { name: "Switch to dark theme" });

    await user.click(button);
    await tick();

    expect(toggleThemeMock).toHaveBeenCalledTimes(1);
    expect(get(theme)).toBe(StoreTheme.Dark);
  });

  it("uses the dark-theme label when the store is pre-set", async () => {
    theme.set(StoreTheme.Dark);
    await tick();

    render(ThemeToggleButton);

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  });
});
