import { browser } from "$app/environment";
import { writable } from "svelte/store";

export enum Theme {
  Light = "light",
  Dark = "dark"
}

const STORAGE_KEY = "kelpie-theme";

function getInitialTheme(): Theme {
  if (!browser) return Theme.Light;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === Theme.Dark ? Theme.Dark : Theme.Light;
}

const themeStore = writable<Theme>(getInitialTheme());

if (browser) {
  themeStore.subscribe((value) => {
    document.documentElement.setAttribute("data-theme", value);
    localStorage.setItem(STORAGE_KEY, value);
  });
}

export const theme = themeStore;

export function toggleTheme(): void {
  themeStore.update((current) => (current === Theme.Light ? Theme.Dark : Theme.Light));
}
