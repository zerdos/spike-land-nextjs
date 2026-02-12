import { describe, expect, it } from "vitest";
import { buildBundleHtml } from "./bundle-template";

const defaultOpts = {
  js: "console.log('hello')",
  css: ".custom { color: red; }",
  html: "<div>test</div>",
  codeSpace: "test-app",
};

describe("buildBundleHtml", () => {
  it("includes Tailwind style block with type text/tailwindcss", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain('<style type="text/tailwindcss">');
    expect(html).toContain('@import "tailwindcss"');
    expect(html).toContain("@theme inline");
    expect(html).toContain("@layer base");
    expect(html).toContain("@custom-variant dark");
  });

  it("includes @tailwindcss/browser script from esm.sh", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain('<script type="module">import "https://esm.sh/@tailwindcss/browser"</script>');
  });

  it("places Tailwind script before the IIFE script", () => {
    const html = buildBundleHtml(defaultOpts);
    const tailwindScriptIdx = html.indexOf("@tailwindcss/browser");
    const iifeScriptIdx = html.indexOf(defaultOpts.js);
    expect(tailwindScriptIdx).toBeLessThan(iifeScriptIdx);
  });

  it("places Tailwind style before user CSS style", () => {
    const html = buildBundleHtml(defaultOpts);
    const tailwindStyleIdx = html.indexOf('type="text/tailwindcss"');
    const userCssIdx = html.indexOf(defaultOpts.css);
    expect(tailwindStyleIdx).toBeLessThan(userCssIdx);
  });

  it("keeps user CSS in a separate plain style block", () => {
    const html = buildBundleHtml(defaultOpts);
    // User CSS should NOT be inside the tailwindcss style block
    const tailwindStyleEnd = html.indexOf("</style>");
    const userCssIdx = html.indexOf(defaultOpts.css);
    expect(userCssIdx).toBeGreaterThan(tailwindStyleEnd);
  });

  it("injects title from codeSpace", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain("<title>test-app - spike.land</title>");
  });

  it("injects JS into script tag", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain(`<script>${defaultOpts.js}</script>`);
  });

  it("injects HTML into embed div", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain(`<div id="embed">${defaultOpts.html}</div>`);
  });

  it("injects user CSS into plain style block", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain(defaultOpts.css);
  });

  it("includes theme variables in @theme inline block", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain("--color-primary: hsl(var(--primary))");
    expect(html).toContain("--color-background: hsl(var(--background))");
    expect(html).toContain("--radius-lg: var(--radius)");
  });

  it("includes CSS custom properties in :root", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain("--background: 0 0% 100%");
    expect(html).toContain("--primary: 222.2 47.4% 11.2%");
    expect(html).toContain("--radius: 0.5rem");
  });

  it("includes keyframe animations", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain("@keyframes accordion-down");
    expect(html).toContain("@keyframes accordion-up");
    expect(html).toContain("@keyframes gradient-x");
  });

  it("includes Google Fonts link", () => {
    const html = buildBundleHtml(defaultOpts);
    expect(html).toContain("fonts.googleapis.com/css2?family=Roboto+Flex");
  });

  it("handles empty css gracefully", () => {
    const html = buildBundleHtml({ ...defaultOpts, css: "" });
    expect(html).toContain('<style type="text/tailwindcss">');
    expect(html).toContain("<style>\n    \n    </style>");
  });
});
