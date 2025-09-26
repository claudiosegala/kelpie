import { describe, it, expect } from "vitest";
import { parseTaskLine, formatTask, parseMarkdown } from "./parseTask";

describe("parseTaskLine", () => {
  it("parses an unchecked task without tags", () => {
    const t = parseTaskLine("- [ ] Buy milk");
    expect(t).not.toBeNull();
    expect(t?.checked).toBe(false);
    expect(t?.title).toBe("Buy milk");
    expect(Object.keys(t?.tags ?? {})).toHaveLength(0);
  });

  it("parses a checked task", () => {
    const t = parseTaskLine("- [x] Wash car");
    expect(t?.checked).toBe(true);
  });

  it("parses @tags correctly", () => {
    const t = parseTaskLine("- [ ] Do taxes @due(2025-04-15) @priority(A) @estimate(2h)");
    expect(t?.tags.due).toBe("2025-04-15");
    expect(t?.tags.priority).toBe("A");
    expect(t?.tags.estimate).toBe("2h");
  });

  it("parses #hashtags correctly", () => {
    const t = parseTaskLine("- [ ] Jogging #health #exercise");
    expect(Array.isArray(t?.tags.hashtags)).toBe(true);
    expect(t?.tags.hashtags).toContain("health");
    expect(t?.tags.hashtags).toContain("exercise");
  });

  it("ignores non-task lines", () => {
    const t = parseTaskLine("## Heading");
    expect(t).toBeNull();
  });
});

describe("formatTask", () => {
  it("round-trips a parsed task", () => {
    const line = "- [ ] Buy milk @due(2025-10-31) #groceries";
    const t = parseTaskLine(line)!;
    const back = formatTask(t);
    expect(back).toContain("Buy milk");
    expect(back).toContain("@due(2025-10-31)");
    expect(back).toContain("#groceries");
  });
});

describe("parseMarkdown", () => {
  it("parses multiple lines", () => {
    const md = `- [ ] One\n- [x] Two`;
    const tasks = parseMarkdown(md);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.checked).toBe(false);
    expect(tasks[1]?.checked).toBe(true);
  });
});
