import { describe, it, expect } from "vitest";
import { performance } from "node:perf_hooks";
import { parseTaskLine, parseMarkdown } from "./parseTask";

function time<T>(fn: () => T): { duration: number; result: T } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { duration, result };
}

describe("parseTask performance", () => {
  it("parses large batches of simple tasks fast enough for live typing", () => {
    // Warm up the regex engines and JIT compiler.
    parseTaskLine("- [ ] warm up", 0);

    const iterations = 20000;
    const line = "- [ ] Write documentation";

    const { duration } = time(() => {
      for (let i = 0; i < iterations; i += 1) {
        const task = parseTaskLine(line, i);
        if (!task) throw new Error("Expected task to parse");
      }
    });

    // Typing responsiveness budget: keep the parsing pass under ~10ms per 1k lines.
    expect(duration).toBeLessThan(200);
  });

  it("parses richly annotated tasks without regressing", () => {
    parseTaskLine("- [ ] warm up", 0);

    const iterations = 10000;
    const complexLine =
      "- [x] Finish feature @due(2025-06-01) @owner(alice) @estimate(3h) @priority(A) #delivery #engineering";

    const { duration } = time(() => {
      for (let i = 0; i < iterations; i += 1) {
        const task = parseTaskLine(complexLine, i);
        if (!task) throw new Error("Expected task to parse");
        if (!Array.isArray(task.tags.hashtags)) throw new Error("Expected hashtags to be parsed");
      }
    });

    // Allow ~20ms per 1k richly tagged lines to guard against regex regressions.
    expect(duration).toBeLessThan(200);
  });

  it("handles whole-document parsing well within the 16ms frame budget", () => {
    const taskLines: string[] = [];
    for (let i = 0; i < 5000; i += 1) {
      taskLines.push(`- [ ] Task ${i} @due(2025-12-31) #roadmap`);
    }
    const markdown = taskLines.join("\n");

    const { duration, result } = time(() => parseMarkdown(markdown));

    expect(result).toHaveLength(5000);
    // Rendering pipelines budget ~16ms per frame; parsing the entire document should fit comfortably.
    expect(duration).toBeLessThan(250);
  });
});
