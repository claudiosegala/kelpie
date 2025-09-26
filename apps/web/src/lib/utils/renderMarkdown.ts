import { Marked } from "marked";
import sanitizeHtml, { type Attributes, type Defaults, type IOptions, type TransformTagsMap } from "sanitize-html";

const markdownParser = new Marked({
  gfm: true,
  breaks: true
});
const sanitizeDefaults: Defaults = sanitizeHtml.defaults;

const allowedTags = Array.from(new Set([...(sanitizeDefaults.allowedTags ?? []), "img", "input"]));

const allowedAttributes: IOptions["allowedAttributes"] = {
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

const allowedClasses: NonNullable<IOptions["allowedClasses"]> = {
  ...baseAllowedClasses,
  code: [...(baseAllowedClasses.code ?? []), /^language-/],
  pre: [...(baseAllowedClasses.pre ?? []), /^language-/]
};

const transformTags: TransformTagsMap = {
  ...(sanitizeDefaults.transformTags ?? {}),
  a: (tagName: string, attribs: Attributes) => ({
    tagName,
    attribs: {
      ...attribs,
      target: attribs.target ?? "_blank",
      rel: attribs.rel ?? "noreferrer noopener"
    }
  }),
  img: (tagName: string, attribs: Attributes) => ({
    tagName,
    attribs: {
      ...attribs,
      loading: attribs.loading ?? "lazy",
      decoding: attribs.decoding ?? "async"
    }
  })
};

const sanitizeOptions: IOptions = {
  ...sanitizeDefaults,
  allowedTags,
  allowedAttributes,
  allowedSchemes,
  allowedSchemesByTag,
  allowedClasses,
  transformTags
};

export function renderMarkdown(markdown: string): string {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const html = markdownParser.parse(normalized) as string;
  return sanitizeHtml(html, sanitizeOptions);
}
