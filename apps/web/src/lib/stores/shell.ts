import { browser } from "$app/environment";
import { readable, writable } from "svelte/store";
import {
  type PanelId,
  type ShellLayout,
  type ShellState,
  type ViewMode,
  defaultPanelForMode,
  isPanelAllowedInMode
} from "$lib/app-shell/contracts";

const initialState: ShellState = {
  layout: "desktop",
  viewMode: "editor-preview",
  activePanel: "editor"
};

const shellStateStore = writable<ShellState>(initialState);

export const shellState = readable<ShellState>(initialState, (set) => {
  const unsubscribe = shellStateStore.subscribe(set);
  return () => unsubscribe();
});

export function setLayout(layout: ShellLayout): void {
  const normalized: ShellLayout = layout === "mobile" ? "desktop" : layout;
  shellStateStore.update((state) => {
    if (state.layout === normalized) return state;
    return { ...state, layout: normalized } satisfies ShellState;
  });
}

export function setViewMode(mode: ViewMode): void {
  shellStateStore.update((state) => {
    if (state.viewMode === mode) return state;
    const nextActive = defaultPanelForMode(mode);
    return { ...state, viewMode: mode, activePanel: nextActive } satisfies ShellState;
  });
}

export function activatePanel(panel: PanelId): void {
  shellStateStore.update((state) => {
    if (!isPanelAllowedInMode(panel, state.viewMode)) {
      return state;
    }
    if (state.activePanel === panel) return state;
    return { ...state, activePanel: panel } satisfies ShellState;
  });
}

export function startLayoutWatcher(query = "(max-width: 960px)"): () => void {
  if (!browser) return () => undefined;

  const mediaQuery = window.matchMedia(query);
  const update = () => setLayout(mediaQuery.matches ? "mobile" : "desktop");
  update();
  mediaQuery.addEventListener("change", update);
  return () => mediaQuery.removeEventListener("change", update);
}
