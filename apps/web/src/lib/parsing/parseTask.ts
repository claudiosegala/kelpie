export type Task = {
  id: string;
  raw: string;
  checked: boolean;
  title: string;
  tags: Record<string, string | string[]>;
  /**
   * Original zero-based line index within the source document.
   * Used for mapping updates back onto the correct Markdown line.
   */
  lineIndex: number;
};

const TAG_RE = /@(\w+)\(([^)]+)\)/g;
const HASH_RE = /#(\w[\w-]*)/g;

function resetLastIndex(re: RegExp): void {
  re.lastIndex = 0;
}

/**
 * Parse a single Markdown line into a Task.
 * Returns null if the line does not match the task pattern.
 */
export function parseTaskLine(line: string, index = 0): Task | null {
  const match = /^\s*[-*+]\s*\[(\s*[xX]?\s*)\]\s*(.*)$/.exec(line);
  if (!match) return null;

  const marker = match[1] ?? "";
  const checked = marker.trim().toLowerCase() === "x";
  let rest: string = match[2]!; // ✅ assert non-null

  const tags: Record<string, string | string[]> = {};

  // @tags
  let t: RegExpExecArray | null;
  resetLastIndex(TAG_RE);
  while ((t = TAG_RE.exec(rest)) !== null) {
    const [, key, value] = t;
    if (key && value) {
      tags[key] = value;
    }
  }
  resetLastIndex(TAG_RE);
  rest = rest.replace(TAG_RE, "");
  resetLastIndex(TAG_RE);

  // #hashtags
  const hashtags: string[] = [];
  let h: RegExpExecArray | null;
  resetLastIndex(HASH_RE);
  while ((h = HASH_RE.exec(rest)) !== null) {
    hashtags.push(h[1]!);
  }
  if (hashtags.length > 0) {
    tags.hashtags = hashtags;
  }
  resetLastIndex(HASH_RE);
  rest = rest.replace(HASH_RE, "");
  resetLastIndex(HASH_RE);

  return {
    id: hashTask(line, index),
    raw: line,
    checked,
    title: rest.trim(),
    tags,
    lineIndex: index
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

function hashTask(raw: string, index: number): string {
  let hash = 0x811c9dc5;

  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  hash ^= index;
  hash = Math.imul(hash, 0x01000193);

  // Ensure positive 32-bit integer and encode as hex with prefix for readability
  const unsigned = hash >>> 0;
  return `task-${unsigned.toString(16).padStart(8, "0")}`;
}
