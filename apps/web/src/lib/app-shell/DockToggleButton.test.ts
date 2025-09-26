import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dockClassesMock = vi.hoisted(() => ({
  getDockButtonClasses: vi.fn(() => "mocked-dock-classes")
}));

vi.mock("./dockButtonClasses", () => dockClassesMock);

import DockToggleButton from "./DockToggleButton.svelte";
import DockToggleButtonHarness from "./DockToggleButtonHarness.svelte";
import { getDockButtonClasses } from "./dockButtonClasses";

const getDockButtonClassesMock = vi.mocked(getDockButtonClasses);

describe("DockToggleButton", () => {
  beforeEach(() => {
    getDockButtonClassesMock.mockClear();
  });

  it("applies computed classes and accessibility attributes", () => {
    render(DockToggleButton, {
      props: {
        id: "preview",
        label: "Preview panel",
        tone: "secondary",
        isActive: true,
        isDisabled: true,
        ariaLabel: "Preview panel button",
        title: "Switch to preview"
      }
    });

    const button = screen.getByRole("button", { name: "Preview panel button" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("title", "Switch to preview");
    expect(button.className).toBe("mocked-dock-classes");
    expect(getDockButtonClassesMock).toHaveBeenCalledWith({
      tone: "secondary",
      isActive: true,
      disabled: true
    });
  });

  it("dispatches a select event with the button identifier", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(DockToggleButtonHarness, {
      props: {
        id: "editor",
        label: "Editor",
        tone: "primary",
        isActive: false,
        onSelect
      }
    });

    const button = screen.getByRole("button", { name: "Editor" });
    await user.click(button);

    expect(onSelect).toHaveBeenCalledWith("editor");
    expect(getDockButtonClassesMock).toHaveBeenCalledWith({
      tone: "primary",
      isActive: false,
      disabled: false
    });
  });
});
