declare module "sanitize-html" {
  namespace sanitizeHtml {
    interface Attributes {
      [attribute: string]: string | undefined;
    }

    interface TransformTagsMap {
      [tagName: string]:
        | string
        | ((tagName: string, attribs: Attributes) => { tagName?: string; attribs?: Attributes });
    }

    interface IOptions {
      allowedTags?: string[];
      allowedAttributes?: Record<string, string[]>;
      allowedSchemes?: string[];
      allowedSchemesByTag?: Record<string, string[]>;
      allowedClasses?: Record<string, Array<string | RegExp>>;
      transformTags?: TransformTagsMap;
      [key: string]: unknown;
    }

    type Defaults = IOptions;
  }

  interface SanitizeHtmlFunction {
    (html: string, options?: sanitizeHtml.IOptions): string;
    defaults: sanitizeHtml.Defaults;
  }

  const sanitizeHtml: SanitizeHtmlFunction;

  export default sanitizeHtml;
  export type IOptions = sanitizeHtml.IOptions;
  export type Attributes = sanitizeHtml.Attributes;
  export type TransformTagsMap = sanitizeHtml.TransformTagsMap;
  export type Defaults = sanitizeHtml.Defaults;
}
