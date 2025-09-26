import { describe, it, expect } from "vitest";
import { parseTaskLine, formatTask, parseMarkdown } from "./parseTask";

describe("parseTaskLine", () => {
  it("parses an unchecked task without tags", () => {
    const t = parseTaskLine("- [ ] Buy milk", 0);
    expect(t).not.toBeNull();
    expect(t?.checked).toBe(false);
    expect(t?.title).toBe("Buy milk");
    expect(Object.keys(t?.tags ?? {})).toHaveLength(0);
  });

  it("parses a checked task", () => {
    const t = parseTaskLine("- [x] Wash car", 5);
    expect(t?.checked).toBe(true);
  });

  it("parses @tags correctly", () => {
    const t = parseTaskLine("- [ ] Do taxes @due(2025-04-15) @priority(A) @estimate(2h)", 1);
    expect(t?.tags.due).toBe("2025-04-15");
    expect(t?.tags.priority).toBe("A");
    expect(t?.tags.estimate).toBe("2h");
  });

  it("parses #hashtags correctly", () => {
    const t = parseTaskLine("- [ ] Jogging #health #exercise", 2);
    expect(Array.isArray(t?.tags.hashtags)).toBe(true);
    expect(t?.tags.hashtags).toContain("health");
    expect(t?.tags.hashtags).toContain("exercise");
  });

  it("ignores non-task lines", () => {
    const t = parseTaskLine("## Heading", 3);
    expect(t).toBeNull();
  });

  it("generates deterministic ids based on line index", () => {
    const first = parseTaskLine("- [ ] Read book", 4);
    const second = parseTaskLine("- [x] Read book", 4);
    const third = parseTaskLine("- [ ] Read book", 5);

    expect(first?.id).toBe("4");
    expect(second?.id).toBe("4");
    expect(third?.id).toBe("5");
    expect(first?.lineIndex).toBe(4);
  });
});

describe("formatTask", () => {
  it("round-trips a parsed task", () => {
    const line = "- [ ] Buy milk @due(2025-10-31) #groceries";
    const t = parseTaskLine(line, 7)!;
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
    expect(tasks[0]?.lineIndex).toBe(0);
    expect(tasks[1]?.lineIndex).toBe(1);
  });
});
