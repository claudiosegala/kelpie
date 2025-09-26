import { browser } from "$app/environment";
import { writable, derived } from "svelte/store";
import { parseMarkdown, formatTask, type Task } from "../parsing/parseTask";
import { markError, markSaved, markSaving } from "./persistence";

export type PersistedState = {
    file: string;
    ui: {
        panes: Record<string, boolean>;
        activeFilters: Record<string, unknown>;
    };
    meta: { version: 1; migratedFrom?: string };
};

const KEY = "kelpie.todo.mmd:v1";

const defaultFile = `- [ ] Buy milk @due(2025-10-31) #groceries
- [x] Wash car @done(2025-09-01)`;

const defaultState: PersistedState = {
    file: defaultFile,
    ui: { panes: {}, activeFilters: {} },
    meta: { version: 1 }
};

function load(): PersistedState {
    if (!browser) {
        return defaultState;
    }
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return defaultState;

        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            "file" in parsed &&
            typeof (parsed as { file: unknown }).file === "string"
        ) {
            return parsed as PersistedState;
        }
        return defaultState;
    } catch {
        return defaultState;
    }
}

export const appState = writable<PersistedState>(load());

if (browser) {
    appState.subscribe((state) => {
        try {
            markSaving();
            localStorage.setItem(KEY, JSON.stringify(state));
            queueMicrotask(markSaved);
        } catch (error) {
            markError(error);
        }
    });
}

/**
 * Derived store: parse tasks from Markdown file.
 */
export const tasks = derived(appState, ($s) => parseMarkdown($s.file));

/**
 * Toggle a task's checked state by id.
 */
export function toggleTask(id: string): void {
    appState.update((s) => {
        const lines = s.file.split(/\r?\n/);
        const parsed = parseMarkdown(s.file);
        const idx = parsed.findIndex((t) => t.id === id);

        if (idx === -1) {
            return s; // nothing to toggle
        }

        const t = parsed[idx];
        if (!t) {
            return s; // extra guard (strict mode safe)
        }

        const updated: Task = {
            id: t.id,
            raw: t.raw,
            title: t.title,
            tags: t.tags,
            checked: !t.checked
        };

        lines[idx] = formatTask(updated);

        return { ...s, file: lines.join("\n") };
    });
}
