const PLACEHOLDER_SUFFIX = "\u0000";
const CODE_PLACEHOLDER_PREFIX = `${PLACEHOLDER_SUFFIX}CODE`;
const IMAGE_PLACEHOLDER_PREFIX = `${PLACEHOLDER_SUFFIX}IMG`;
const LINK_PLACEHOLDER_PREFIX = `${PLACEHOLDER_SUFFIX}LNK`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function renderInline(text: string): string {
  const codeTokens: string[] = [];
  let working = text.replace(/`([^`]+)`/g, (_, code: string) => {
    const index = codeTokens.length;
    codeTokens.push(`<code>${escapeHtml(code)}</code>`);
    return `${CODE_PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
  });

  const imageTokens: string[] = [];
  working = working.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, src: string) => {
    const index = imageTokens.length;
    imageTokens.push(`<img src="${escapeAttribute(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />`);
    return `${IMAGE_PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
  });

  const linkTokens: Array<{ label: string; href: string }> = [];
  working = working.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
    const index = linkTokens.length;
    linkTokens.push({ label, href });
    return `${LINK_PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
  });

  let escaped = escapeHtml(working);

  escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/__(.+?)__/g, "<strong>$1</strong>");
  escaped = escaped.replace(/~~(.+?)~~/g, "<del>$1</del>");
  escaped = escaped.replace(/(^|[^*])\*(?!\s)([^*]+?)(?<!\s)\*(?!\*)/g, "$1<em>$2</em>");
  escaped = escaped.replace(/(^|[^_])_(?!\s)([^_]+?)(?<!\s)_(?!_)/g, "$1<em>$2</em>");

  const linkPattern = new RegExp(`${LINK_PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, "g");
  escaped = escaped.replace(linkPattern, (_, rawIndex: string) => {
    const index = Number(rawIndex);
    const token = linkTokens[index];
    if (!token) return "";
    const labelHtml = renderInline(token.label);
    const href = escapeAttribute(token.href);
    return `<a href="${href}" target="_blank" rel="noreferrer noopener">${labelHtml}</a>`;
  });

  const imagePattern = new RegExp(`${IMAGE_PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, "g");
  escaped = escaped.replace(imagePattern, (_, rawIndex: string) => {
    const index = Number(rawIndex);
    return imageTokens[index] ?? "";
  });

  const codePattern = new RegExp(`${CODE_PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, "g");
  escaped = escaped.replace(codePattern, (_, rawIndex: string) => {
    const index = Number(rawIndex);
    return codeTokens[index] ?? "";
  });

  return escaped;
}

function finalizeParagraph(html: string[], paragraphOpen: boolean): boolean {
  if (paragraphOpen) {
    html.push("</p>");
    return false;
  }
  return paragraphOpen;
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];

  let paragraphOpen = false;
  let listType: "ul" | "ol" | null = null;
  let blockquoteOpen = false;
  let inCodeBlock = false;
  let codeLanguage = "";
  const codeBuffer: string[] = [];

  const closeParagraph = () => {
    paragraphOpen = finalizeParagraph(html, paragraphOpen);
  };

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const closeBlockquote = () => {
    if (blockquoteOpen) {
      closeParagraph();
      closeList();
      html.push("</blockquote>");
      blockquoteOpen = false;
    }
  };

  const flushCodeBlock = () => {
    const codeContent = codeBuffer.join("\n");
    const langClass = codeLanguage ? ` class="language-${escapeAttribute(codeLanguage)}"` : "";
    html.push(`<pre><code${langClass}>${escapeHtml(codeContent)}</code></pre>`);
    codeBuffer.length = 0;
    codeLanguage = "";
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (inCodeBlock) {
      if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
        flushCodeBlock();
        inCodeBlock = false;
        continue;
      }
      codeBuffer.push(rawLine);
      continue;
    }

    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      closeParagraph();
      closeList();
      inCodeBlock = true;
      codeLanguage = trimmed.slice(3).trim();
      if (codeLanguage.startsWith("`") || codeLanguage.startsWith("~")) {
        codeLanguage = codeLanguage.replace(/^[`~]+/, "");
      }
      continue;
    }

    if (trimmed === "") {
      closeParagraph();
      closeList();
      closeBlockquote();
      continue;
    }

    let workingLine = rawLine;
    if (trimmed.startsWith(">")) {
      if (!blockquoteOpen) {
        closeParagraph();
        closeList();
        html.push("<blockquote>");
        blockquoteOpen = true;
      }
      workingLine = workingLine.replace(/^\s*>\s?/, "");
    } else if (blockquoteOpen) {
      closeBlockquote();
      workingLine = rawLine;
    }

    const workingTrimmed = workingLine.trim();

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(workingTrimmed)) {
      closeParagraph();
      closeList();
      html.push("<hr />");
      continue;
    }

    const headingMatch = workingTrimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeParagraph();
      closeList();
      const [, hashes = "", headingTitle = ""] = headingMatch;
      const level = Math.min(Math.max(hashes.length, 1), 6);
      html.push(`<h${level}>${renderInline(headingTitle)}</h${level}>`);
      continue;
    }

    const listMatch = workingTrimmed.match(/^(\d+\.|[-*+])\s+(.*)$/);
    if (listMatch) {
      const [, bullet = "", rawContent = ""] = listMatch;
      const type = /^\d+\.$/.test(bullet) ? "ol" : "ul";
      if (listType !== type) {
        closeParagraph();
        closeList();
        html.push(`<${type}>`);
        listType = type;
      }
      const content = rawContent ?? "";
      const taskMatch = type === "ul" ? content.match(/^\[( |x|X)\]\s+(.*)$/) : null;
      if (taskMatch) {
        const [, marker = " ", taskLabel = ""] = taskMatch;
        const checked = marker.trim().toLowerCase() === "x";
        const label = renderInline(taskLabel);
        html.push(
          `<li><label class="inline-flex items-start gap-2 align-top"><input type="checkbox" disabled ${checked ? "checked" : ""} /><span>${label}</span></label></li>`
        );
      } else {
        html.push(`<li>${renderInline(content)}</li>`);
      }
      continue;
    }

    if (listType) {
      closeList();
    }

    if (!paragraphOpen) {
      html.push("<p>");
      paragraphOpen = true;
    } else {
      html.push("<br />");
    }

    html.push(renderInline(workingTrimmed));
  }

  if (inCodeBlock) {
    flushCodeBlock();
  }

  closeParagraph();
  closeList();
  closeBlockquote();

  return html.join("\n");
}
