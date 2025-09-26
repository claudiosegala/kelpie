import { browser } from "$app/environment";
import { writable } from "svelte/store";

export type ThemeName = "light" | "dark";

const STORAGE_KEY = "kelpie-theme";

function getInitialTheme(): ThemeName {
  if (!browser) return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

const themeStore = writable<ThemeName>(getInitialTheme());

if (browser) {
  themeStore.subscribe((value) => {
    document.documentElement.setAttribute("data-theme", value);
    localStorage.setItem(STORAGE_KEY, value);
  });
}

export const theme = themeStore;

export function toggleTheme(): void {
  themeStore.update((current) => (current === "light" ? "dark" : "light"));
}
