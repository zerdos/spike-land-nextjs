/**
 * Parses content for wiki-style links [[topic]] or [[topic|alias]]
 * Returns transformed content with markdown links and a list of extracted link slugs.
 */
export function parseWikiLinks(content: string): {
  content: string;
  links: string[];
} {
  const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];

  const transformed = content.replace(wikiLinkPattern, (_, match) => {
    // Handle aliasing: [[topic|alias]]
    const parts = match.split("|");
    const topic = parts[0].trim();
    const alias = parts.length > 1 ? parts[1].trim() : topic;

    // Convert topic to slug: "Advanced React" -> "advanced-react"
    // We assume top-level search for now, or relative navigation?
    // Let's stick to simple slugification for search/navigation
    const slug = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    links.push(slug);

    return `[${alias}](/learnit/${slug})`;
  });

  return { content: transformed, links };
}
