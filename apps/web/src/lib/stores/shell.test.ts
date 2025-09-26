import { afterEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { activatePanel, setLayout, setViewMode, shellState } from './shell';
import { defaultPanelForMode } from '$lib/app-shell/contracts';

describe('shell store', () => {
        afterEach(() => {
                setLayout('desktop');
                setViewMode('editor-preview');
        });

        it('provides default panel for each mode', () => {
                expect(defaultPanelForMode('editor-preview')).toBe('editor');
                expect(defaultPanelForMode('preview-only')).toBe('preview');
                expect(defaultPanelForMode('settings')).toBe('settings');
        });

        it('switches to preview-only mode and updates active panel on mobile', () => {
                setLayout('mobile');
                setViewMode('preview-only');

                const state = get(shellState);
                expect(state.viewMode).toBe('preview-only');
                expect(state.activePanel).toBe('preview');
        });

        it('ignores invalid panel activation in current mode', () => {
                setViewMode('editor-preview');
                setLayout('mobile');
                activatePanel('settings');

                const state = get(shellState);
                expect(state.activePanel).toBe('editor');
        });
});
