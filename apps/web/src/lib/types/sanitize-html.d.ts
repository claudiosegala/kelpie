declare module "sanitize-html" {
  export interface Attributes {
    [attribute: string]: string | undefined;
  }

  export interface TransformTagResult {
    tagName: string;
    attribs: Attributes;
  }

  export type TransformTag = (tagName: string, attribs: Attributes) => TransformTagResult;

  export interface TransformTags {
    [tagName: string]: TransformTag | string | undefined;
  }

  export interface IOptions {
    allowedTags?: (string | RegExp)[];
    allowedAttributes?: Record<string, (string | RegExp)[]>;
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowedClasses?: Record<string, (string | RegExp)[]>;
    transformTags?: TransformTags;
    [key: string]: unknown;
  }

  export interface SanitizeHtml {
    (input: string, options?: IOptions): string;
    defaults: IOptions;
  }

  const sanitizeHtml: SanitizeHtml;

  export default sanitizeHtml;
}
