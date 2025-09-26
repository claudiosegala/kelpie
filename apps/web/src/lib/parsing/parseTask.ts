export type Task = {
  id: string;
  raw: string;
  checked: boolean;
  title: string;
  tags: Record<string, string | string[]>;
  /** Zero-based position of the line within the source document. */
  lineIndex: number;
};

const TAG_RE = /@(\w+)\(([^)]+)\)/g;
const HASH_RE = /#(\w[\w-]*)/g;

/**
 * Parse a single Markdown line into a Task.
 * Returns null if the line does not match the task pattern.
 */
export function parseTaskLine(line: string, lineIndex = 0): Task | null {
  const match = /^-\s\[( |x)\]\s(.*)$/.exec(line);
  if (!match) return null;

  const checked = match[1] === "x";
  const body: string = match[2]!;
  let rest: string = body; // ✅ assert non-null

  const tags: Record<string, string | string[]> = {};

  // @tags
  let t: RegExpExecArray | null;
  while ((t = TAG_RE.exec(rest)) !== null) {
    const [, key, value] = t;
    if (key && value) {
      tags[key] = value;
    }
  }
  rest = rest.replace(TAG_RE, "");

  // #hashtags
  const hashtags: string[] = [];
  let h: RegExpExecArray | null;
  while ((h = HASH_RE.exec(rest)) !== null) {
    hashtags.push(h[1]!);
  }
  if (hashtags.length > 0) {
    tags.hashtags = hashtags;
  }
  rest = rest.replace(HASH_RE, "");

  return {
    id: `${lineIndex}`,
    raw: line,
    checked,
    title: rest.trim(),
    tags,
    lineIndex
  };
}

/**
 * Convert a Task back into a Markdown line.
 */
export function formatTask(task: Task): string {
  const box = task.checked ? "x" : " ";
  let out = `- [${box}] ${task.title}`;
  for (const [k, v] of Object.entries(task.tags)) {
    if (k === "hashtags" && Array.isArray(v)) {
      out += " " + v.map((h) => `#${h}`).join(" ");
    } else {
      out += ` @${k}(${v})`;
    }
  }
  return out.trim();
}

/**
 * Parse a Markdown document into an array of Tasks.
 */
export function parseMarkdown(md: string): Task[] {
  return md
    .split(/\r?\n/)
    .map((line, index) => parseTaskLine(line, index))
    .filter((x): x is Task => x !== null);
}
