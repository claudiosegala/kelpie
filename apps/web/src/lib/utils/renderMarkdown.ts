import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

const markdownParser = new Marked({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false
});

const sanitizeDefaults = sanitizeHtml.defaults;

const allowedTags = Array.from(new Set([...(sanitizeDefaults.allowedTags ?? []), "img", "input"]));

const allowedAttributes: sanitizeHtml.IOptions["allowedAttributes"] = {
  ...sanitizeDefaults.allowedAttributes,
  a: ["href", "name", "target", "rel", "title"],
  code: ["class"],
  pre: ["class"],
  img: ["src", "alt", "title", "loading", "decoding"],
  input: ["type", "checked", "disabled"]
};

const allowedSchemes = Array.from(new Set([...(sanitizeDefaults.allowedSchemes ?? []), "mailto", "tel"]));

const allowedSchemesByTag = {
  ...sanitizeDefaults.allowedSchemesByTag,
  img: ["http", "https", "data"]
};

const baseAllowedClasses = sanitizeDefaults.allowedClasses ?? {};

const allowedClasses = {
  ...baseAllowedClasses,
  code: [...(baseAllowedClasses.code ?? []), /^language-/],
  pre: [...(baseAllowedClasses.pre ?? []), /^language-/]
};

const sanitizeOptions: sanitizeHtml.IOptions = {
  ...sanitizeDefaults,
  allowedTags,
  allowedAttributes,
  allowedSchemes,
  allowedSchemesByTag,
  allowedClasses,
  transformTags: {
    ...sanitizeDefaults.transformTags,
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: attribs.target ?? "_blank",
        rel: attribs.rel ?? "noreferrer noopener"
      }
    }),
    img: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        loading: attribs.loading ?? "lazy",
        decoding: attribs.decoding ?? "async"
      }
    })
  }
};

export function renderMarkdown(markdown: string): string {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const html = markdownParser.parse(normalized) as string;
  return sanitizeHtml(html, sanitizeOptions);
}
