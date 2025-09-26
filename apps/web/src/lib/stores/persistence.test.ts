import { get } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaveStatusKind } from "$lib/app-shell/contracts";
import { markError, markSaved, markSaving, resetSaveStatus, saveStatus } from "./persistence";

describe("persistence saveStatus store", () => {
  afterEach(() => {
    resetSaveStatus();
    vi.useRealTimers();
  });

  it("starts idle with saved messaging", () => {
    const status = get(saveStatus);
    expect(status).toEqual({ kind: SaveStatusKind.Idle, message: "Saved locally \u2713", timestamp: null });
  });

  it("records saving state with timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-04-01T08:00:00Z"));

    markSaving();
    const status = get(saveStatus);
    expect(status.kind).toBe(SaveStatusKind.Saving);
    expect(status.message).toBe("Saving locally\u2026");
    expect(status.timestamp).toBe(Date.now());
  });

  it("records saved state with timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-04-01T08:05:00Z"));

    markSaved();
    const status = get(saveStatus);
    expect(status.kind).toBe(SaveStatusKind.Saved);
    expect(status.message).toBe("Saved locally \u2713");
    expect(status.timestamp).toBe(Date.now());
  });

  it("captures error messages while timestamping", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-04-01T08:10:00Z"));

    markError(new Error("Disk full"));
    const status = get(saveStatus);
    expect(status.kind).toBe(SaveStatusKind.Error);
    expect(status.message).toBe("Disk full");
    expect(status.timestamp).toBe(Date.now());
  });

  it("falls back to friendly error when unknown value provided", () => {
    markError(42);
    const status = get(saveStatus);
    expect(status.message).toBe("Failed to save locally");
  });

  it("resetSaveStatus restores idle contract", () => {
    markSaving();
    resetSaveStatus();
    const status = get(saveStatus);
    expect(status).toEqual({ kind: SaveStatusKind.Idle, message: "Saved locally \u2713", timestamp: null });
  });
});
