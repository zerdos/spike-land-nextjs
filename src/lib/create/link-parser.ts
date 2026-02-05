/**
 * Parses content for internal wiki-style links like [[/create/foo/bar]]
 * and transforms them into HTML anchor tags.
 * Also extracts the slugs for tracking.
 */
export function parseInternalLinks(content: string): {
  html: string;
  links: string[];
} {
  const links: string[] = [];

  // Regex to match [[path]]
  // We assume path starts with /create/ or is relative?
  // The prompt usually asks for [[/create/foo]]

  const regex = /\[\[(.*?)\]\]/g;

  const html = content.replace(regex, (_, path) => {
    // Basic cleanup
    const cleanPath = path.trim();

    // Extract slug if it starts with /create/
    if (cleanPath.startsWith("/create/")) {
      const slug = cleanPath.replace("/create/", "");
      if (slug) links.push(slug);
    }

    // Safe encoder for HTML attributes
    const safePath = cleanPath.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Create anchor tag
    // We add a specific class for styling if needed
    return `<a href="${safePath}" class="text-blue-500 hover:underline internal-link">${safePath}</a>`;
  });

  return { html, links };
}

/**
 * Inject the link parser script into the generated React code?
 * Actually, usually we generate a React app.
 * If the AI generates React code, the links might be in JSX.
 *
 * If the AI outputs:
 * <a href="/create/foo">...</a>
 * Then we don't need this parser for the React code itself,
 * unless we want to track the links.
 *
 * But if the requirement says "Interpret URL path as prompt... include 3-5 links",
 * The AI will likely generate standard JSX with <Link> or <a> tags.
 *
 * However, the prompt in the plan says: "Include 3-5 links using [[/create/related-path]] syntax".
 * If the AI puts `[[...]]` in JSX, it will render as text.
 * We might need to post-process the code or tell AI to use `<a>` tags directly.
 *
 * Using `<a>` tags is safer for a generated React app that mimics a full app.
 * `[[...]]` is good for "wiki" style text, but for a React app, standard HTML is better.
 *
 * Let's stick to the Parse logic for metadata extraction, but maybe update valid prompt to use standard anchors.
 * Or if we really want `[[...]]` support in the React app, we'd need a component to render it.
 *
 * For now, I'll provide this utility, but I might adjust the prompt to output standard links,
 * and use regex to find `href="/create/..."` to populate `outgoingLinks`.
 */

export function extractOutgoingLinks(code: string): string[] {
  const links: string[] = [];
  // Match href="/create/..." or href='/create/...'
  const regex = /href=["']\/create\/(.*?)["']/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    if (match[1]) {
      links.push(match[1]);
    }
  }
  return links;
}
