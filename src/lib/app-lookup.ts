import prisma from "@/lib/prisma";

/**
 * Include options for app queries
 */
export const appIncludeOptions = {
  requirements: {
    orderBy: { createdAt: "asc" as const },
  },
  monetizationModels: {
    orderBy: { createdAt: "asc" as const },
  },
  statusHistory: {
    orderBy: { createdAt: "desc" as const },
    take: 10,
    select: {
      id: true,
      status: true,
      message: true,
      createdAt: true,
    },
  },
  _count: {
    select: {
      messages: true,
      images: true,
    },
  },
};

/**
 * Flexible app lookup that supports multiple identifier types:
 * 1. codespaceId (primary) - the codespace name
 * 2. slug (fallback) - URL-friendly identifier
 * 3. id (backward compat) - database cuid
 *
 * This enables URL migration from /my-apps/[id] to /my-apps/[codeSpace]
 * while maintaining backward compatibility with existing links.
 */
export async function findAppByIdentifier(
  identifier: string,
  userId: string,
) {
  // First, try to find by codespaceId (most common case)
  let app = await prisma.app.findFirst({
    where: {
      codespaceId: identifier,
      userId,
      status: { not: "ARCHIVED" },
    },
    include: appIncludeOptions,
  });

  if (app) return app;

  // Fallback: try by slug
  app = await prisma.app.findFirst({
    where: {
      slug: identifier,
      userId,
      status: { not: "ARCHIVED" },
    },
    include: appIncludeOptions,
  });

  if (app) return app;

  // Fallback: try by id if it looks like a cuid (backward compatibility)
  // cuids start with 'c' and are typically 25 characters
  if (/^c[a-z0-9]{20,}$/i.test(identifier)) {
    app = await prisma.app.findFirst({
      where: {
        id: identifier,
        userId,
        status: { not: "ARCHIVED" },
      },
      include: appIncludeOptions,
    });
  }

  return app;
}

/**
 * Simple app lookup without includes (for validation/existence checks)
 */
export async function findAppByIdentifierSimple(
  identifier: string,
  userId: string,
) {
  // First, try by codespaceId
  let app = await prisma.app.findFirst({
    where: {
      codespaceId: identifier,
      userId,
      status: { not: "ARCHIVED" },
    },
  });

  if (app) return app;

  // Fallback: try by slug
  app = await prisma.app.findFirst({
    where: {
      slug: identifier,
      userId,
      status: { not: "ARCHIVED" },
    },
  });

  if (app) return app;

  // Fallback: try by id if it looks like a cuid
  if (/^c[a-z0-9]{20,}$/i.test(identifier)) {
    app = await prisma.app.findFirst({
      where: {
        id: identifier,
        userId,
        status: { not: "ARCHIVED" },
      },
    });
  }

  return app;
}

/**
 * Check if codespace has actual content (not default placeholder)
 */
export async function checkCodespaceHasContent(
  codeSpace: string,
): Promise<boolean> {
  const DEFAULT_CONTENT = "<div>Write your code here!</div>";

  try {
    const response = await fetch(
      `https://testing.spike.land/live/${encodeURIComponent(codeSpace)}/htm`,
      { cache: "no-store" },
    );

    if (!response.ok) return false;

    const html = await response.text();
    return html.trim() !== DEFAULT_CONTENT;
  } catch {
    return false;
  }
}
