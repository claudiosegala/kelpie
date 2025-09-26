# Code Editor Panel Spec

## 1. Overview

The **Code Editor Panel** is the primary authoring surface in the Kelpie web app. It is implemented as a Svelte component that renders a single Markdown-friendly `<textarea>` with light chrome so the shell can embed it alongside other panels. The component keeps a local draft of the incoming text, emits change events back to the shell, and reports whether a user is actively editing so that other parts of the UI can respond (e.g., hide panels on mobile or debounce persistence).

The panel intentionally stays lightweight: it does not embed Monaco or any advanced IDE interactions yet. Instead, it focuses on predictable data flow and accessibility so future enhancements can layer on richer editing behavior without rewriting the base component.

## 2. Public API

### Props

| Prop          | Type     | Default                                      | Description                                      |
| ------------- | -------- | -------------------------------------------- | ------------------------------------------------ |
| `value`       | `string` | `""`                                         | Current Markdown document supplied by the shell. |
| `placeholder` | `string` | `"- [ ] Example task @due(2025-10-01) #tag"` | Helper text shown when the editor is empty.      |

### Events

| Event           | Payload                  | When it fires                                                             |
| --------------- | ------------------------ | ------------------------------------------------------------------------- |
| `contentChange` | `{ value: string }`      | Triggered on every input event so the shell can update state immediately. |
| `editingState`  | `{ isEditing: boolean }` | Fired on focus/blur to indicate whether the user is actively editing.     |

The component is exported from `$lib/panels/editor/CodeEditorPanel.svelte` and re-exported through `$lib/index.ts` for external consumption.

## 3. Visual Structure

- **Section container** – fills the available height, uses `bg-base-200/40` for contrast, and relies on Tailwind + DaisyUI utilities already configured in the project.
- **Header** – displays "Code Editor" inside a tooltip that explains the area accepts GitHub Flavored Markdown.
- **Editor body** – houses the `<textarea>` with rounded corners, inner shadow, and focus ring styles that align with the rest of the shell.

## 4. Behavior

1. **Draft synchronisation**
   - On mount the internal `draft` mirrors the incoming `value`.
   - When the component receives a new `value` while not editing, the textarea updates immediately.
   - While focused, user edits stay local even if `value` props change, preventing flicker from debounced persistence. Once the field blurs, the next `value` update is reflected in the UI.
2. **Change propagation**
   - Every input event updates the local `draft` and dispatches `contentChange` with the raw string so stores can keep a live copy.
3. **Editing state reporting**
   - Focus sets `isEditing = true` and dispatches `editingState` so layout logic can respond (e.g., switch to editor-only mode on mobile).
   - Blur resets `isEditing` and dispatches the corresponding event.
4. **Accessibility**
   - The textarea uses `aria-label="Markdown editor"` for screen readers.
   - Tooltip copy is descriptive but concise, and the heading uses semantic markup for navigation.

## 5. Non-goals (current iteration)

- Rich text or Monaco integration.
- Undo/redo commands or keyboard shortcut orchestration.
- Diagnostics, metadata helpers, or history panes.
- Autosave or storage state indicators (handled elsewhere in the shell).

These capabilities are expected to be layered on top of the existing component once supporting infrastructure is ready.

## 6. Testing

Unit tests live at `/apps/web/src/lib/panels/editor/CodeEditorPanel.test.ts` and cover:

- Rendering of the heading and textarea with supplied props.
- Emission of `contentChange` payloads as the user types.
- Emission of `editingState` events on focus and blur.
- Draft synchronisation rules between local edits and external prop updates.

Vitest with `@testing-library/svelte` is used for these tests (see `apps/web/package.json` → `test:unit`).

## 7. Implementation notes

- Component path: `/apps/web/src/lib/panels/editor/CodeEditorPanel.svelte`.
- Styling relies exclusively on Tailwind utility classes already defined in the project theme.
- Local state is confined to a `draft` string and `isEditing` boolean so the component stays portable and easy to embed in stories or integration tests.

## 8. Future opportunities

- Introduce command surfaces (undo/redo buttons, metadata helpers) once supporting stores exist.
- Wire in validation/diagnostics surfaced by the preview pipeline.
- Explore richer editing experiences (Monaco, keyboard shortcuts) building on top of the existing prop/event contract.
