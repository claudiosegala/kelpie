import { mdsvex } from "mdsvex";

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

const TAG_PATTERN = /@(\w+)\(([^)]+)\)/g;
const HASH_PATTERN = /#(\w[\w-]*)/g;

type MdastPosition = { start: { line: number } };
type MdastNode = {
  type: string;
  children?: MdastNode[];
  value?: string;
  checked?: boolean | null;
  position?: MdastPosition | null;
};
type MdastRoot = MdastNode & { children: MdastNode[] };

let processor: { parse: (markdown: string) => MdastRoot } | null = null;

const processorReady = initializeProcessor();
await processorReady;

async function initializeProcessor(): Promise<void> {
  if (processor) return;

  let captured: { parse: (markdown: string) => MdastRoot } | null = null;
  const capturePlugin = function (this: { parse: (markdown: string) => MdastRoot }) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    captured = this;
  };

  const preprocessor = mdsvex({
    highlight: false,
    smartypants: false,
    remarkPlugins: [capturePlugin],
    rehypePlugins: []
  });

  await preprocessor.markup({ content: "", filename: "kelpie-init.svx" });

  if (!captured) {
    throw new Error("Failed to initialize Markdown parser");
  }

  processor = captured;
}

type ExtractedTask = Omit<Task, "id">;

function buildTasksFromTree(tree: MdastRoot, lines: string[]): ExtractedTask[] {
  const tasks: ExtractedTask[] = [];

  visitListItems(tree, (node) => {
    const position = node.position ?? null;
    const zeroBasedIndex = position ? Math.max(0, position.start.line - 1) : 0;
    const lineIndex = Math.min(zeroBasedIndex, Math.max(0, lines.length - 1));
    const raw = lines[lineIndex] ?? "";

    const lineMatch = raw.match(/^\s*(?:[-*+]\s*|\d+\.\s*)\[(\s*[xX]?\s*)\]\s*(.*)$/);
    if (!lineMatch) {
      return;
    }

    const marker = lineMatch[1] ?? "";
    const remainder = lineMatch[2] ?? "";
    const checked = marker.trim().toLowerCase() === "x";
    const { title, tags } = extractTitleAndTags(remainder);

    tasks.push({
      raw,
      checked,
      title,
      tags,
      lineIndex
    });
  });

  return tasks;
}

function extractTitleAndTags(input: string): { title: string; tags: Record<string, string | string[]> } {
  const tags: Record<string, string | string[]> = {};

  const tagMatches = Array.from(input.matchAll(new RegExp(TAG_PATTERN.source, TAG_PATTERN.flags)));
  for (const match of tagMatches) {
    const [, key, value] = match;
    if (key && value) {
      tags[key] = value;
    }
  }

  const withoutTags = input.replace(new RegExp(TAG_PATTERN.source, TAG_PATTERN.flags), "");

  const hashtags = Array.from(withoutTags.matchAll(new RegExp(HASH_PATTERN.source, HASH_PATTERN.flags)))
    .map((match) => match[1] ?? "")
    .filter((tag) => tag.length > 0);

  if (hashtags.length > 0) {
    tags.hashtags = hashtags;
  }

  const title = withoutTags.replace(new RegExp(HASH_PATTERN.source, HASH_PATTERN.flags), "").trim();

  return { title, tags };
}

/**
 * Parse a single Markdown line into a Task.
 * Returns null if the line does not match the task pattern.
 */
export function parseTaskLine(line: string, index = 0): Task | null {
  if (!processor) {
    throw new Error("Markdown parser is not ready");
  }

  const tree = processor.parse(line);
  const [first] = buildTasksFromTree(tree, [line]);
  if (!first) return null;

  return {
    id: hashTask(line, index),
    raw: line,
    checked: first.checked,
    title: first.title,
    tags: first.tags,
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
  if (!processor) {
    throw new Error("Markdown parser is not ready");
  }

  const tree = processor.parse(md);
  const lines = md.split(/\r?\n/);
  return buildTasksFromTree(tree, lines).map((task) => ({
    ...task,
    id: hashTask(task.raw, task.lineIndex)
  }));
}

function visitListItems(node: MdastNode, visitor: (node: MdastNode) => void): void {
  if (!node) return;
  if (node.type === "listItem") {
    visitor(node);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      visitListItems(child, visitor);
    }
  }
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
