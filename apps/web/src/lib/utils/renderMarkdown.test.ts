import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./renderMarkdown";

describe("renderMarkdown", () => {
  it("adds default target and rel attributes to links", () => {
    const output = renderMarkdown("[link](https://example.com)");

    expect(output).toContain('href="https://example.com"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noreferrer noopener"');
  });

  it("sets lazy loading defaults on images", () => {
    const output = renderMarkdown("![alt text](https://example.com/cat.png)");

    expect(output).toContain('src="https://example.com/cat.png"');
    expect(output).toContain('loading="lazy"');
    expect(output).toContain('decoding="async"');
  });

  it("removes disallowed tags like script", () => {
    const output = renderMarkdown("<p>safe</p><script>alert('xss')</script>");

    expect(output).toContain("<p>safe</p>");
    expect(output).not.toContain("script");
  });

  it("allows mailto and tel links", () => {
    const mailto = renderMarkdown("[Email me](mailto:test@example.com)");
    const tel = renderMarkdown("[Call me](tel:+15555551234)");

    expect(mailto).toContain('href="mailto:test@example.com"');
    expect(tel).toContain('href="tel:+15555551234"');
  });

  it("respects explicitly provided link targets and rel attributes", () => {
    const output = renderMarkdown('<a href="https://example.com" target="_self" rel="nofollow">link</a>');

    expect(output).toContain('href="https://example.com"');
    expect(output).toContain('target="_self"');
    expect(output).toContain('rel="nofollow"');
    expect(output).not.toContain('rel="noreferrer noopener"');
  });

  it("normalizes Windows newlines so breaks render consistently", () => {
    const output = renderMarkdown("line one\r\nline two");

    expect(output).not.toContain("\r");
    expect(output).toMatch(/line one<BR\s*\/?\s*>\s*line two/i);
  });

  it("allows data URIs on images while preserving lazy defaults", () => {
    const output = renderMarkdown(
      "![pixel](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAE0lEQVR42mP8z/D/PwMDAwMjAAAfewM3WJSrlAAAAABJRU5ErkJggg==)"
    );

    expect(output).toContain(
      'src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAE0lEQVR42mP8z/D/PwMDAwMjAAAfewM3WJSrlAAAAABJRU5ErkJggg=="'
    );
    expect(output).toContain('loading="lazy"');
    expect(output).toContain('decoding="async"');
  });

  it("strips unsafe attributes from elements", () => {
    const output = renderMarkdown(
      '<img src="https://example.com/cat.png" alt="cat" onerror="alert(1)"><script>alert()</script>'
    );

    expect(output).toContain('src="https://example.com/cat.png"');
    expect(output).toContain('alt="cat"');
    expect(output).not.toContain("onerror");
    expect(output).not.toContain("<script>");
  });

  it("retains syntax highlighting classes on fenced code blocks", () => {
    const output = renderMarkdown("```js\nconsole.log('hi');\n```\n");

    expect(output).toContain('<pre><code class="language-js">');
    expect(output).toContain("console.log('hi');");
  });

  it("preserves language classes provided directly in HTML", () => {
    const output = renderMarkdown(
      '<pre class="language-ts"><code class="language-ts">const x: number = 1;</code></pre>'
    );

    expect(output).toContain('<pre class="language-ts">');
    expect(output).toContain('<code class="language-ts">');
  });

  it("supports whitelisted attributes on input elements", () => {
    const output = renderMarkdown('<input type="checkbox" checked disabled>');

    expect(output).toContain("<input");
    expect(output).toContain('type="checkbox"');
    expect(output).toMatch(/checked(="checked")?/);
    expect(output).toMatch(/disabled(="disabled")?/);
  });
});
