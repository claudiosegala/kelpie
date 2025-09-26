import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import CodeEditorPanel from "./CodeEditorPanel.svelte";
import TestHarness from "./CodeEditorPanel.test-harness.svelte";

describe("CodeEditorPanel", () => {
  it("renders heading and textarea with provided value and placeholder", () => {
    render(CodeEditorPanel, {
      value: "- [ ] Write tests",
      placeholder: "Start writing tasks"
    });

    expect(screen.getByRole("heading", { name: "Code Editor" })).toBeVisible();

    const textarea = screen.getByLabelText("Markdown editor");
    expect(textarea).toHaveValue("- [ ] Write tests");
    expect(textarea).toHaveAttribute("placeholder", "Start writing tasks");
  });

  it("emits contentChange events as the user types", async () => {
    const onContentChange = vi.fn();

    render(TestHarness, { value: "", onContentChange });
    const textarea = screen.getByLabelText("Markdown editor");

    await fireEvent.input(textarea, { target: { value: "- [ ] Updated" } });

    expect(onContentChange).toHaveBeenCalledWith({ value: "- [ ] Updated" });
  });

  it("reports editing state changes on focus and blur", async () => {
    const onEditingState = vi.fn();

    render(TestHarness, { value: "", onEditingState });
    const textarea = screen.getByLabelText("Markdown editor");

    await fireEvent.focus(textarea);
    await fireEvent.blur(textarea);

    expect(onEditingState).toHaveBeenNthCalledWith(1, { isEditing: true });
    expect(onEditingState).toHaveBeenNthCalledWith(2, { isEditing: false });
  });

  it("syncs the draft with the provided value when not editing and preserves local edits while focused", async () => {
    const { rerender } = render(TestHarness, { value: "Initial" });
    const textarea = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;

    await rerender({ value: "Parent update" });
    await tick();
    expect(textarea.value).toBe("Parent update");

    await fireEvent.focus(textarea);
    await fireEvent.input(textarea, { target: { value: "Local edit" } });

    await rerender({ value: "Another parent update" });
    await tick();
    expect(textarea.value).toBe("Local edit");

    await fireEvent.blur(textarea);
    await tick();
    expect(textarea.value).toBe("Another parent update");
  });
});
