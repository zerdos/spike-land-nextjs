// MCP Domain Worker: Knowledge
// Handles: learnit, blog, career, bazdmeg

const TOOLS = [
  // ── LearnIt Tools ──
  {
    name: "learnit_get_topic",
    description: "Get a LearnIt wiki topic by slug. Returns title, description, and content (truncated to ~4000 chars). Increments view count.",
    category: "learnit",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Unique slug of the topic (e.g. 'javascript/closures')." },
      },
      required: ["slug"],
    },
  },
  {
    name: "learnit_search_topics",
    description: "Search published LearnIt topics by title, description, or slug. Ordered by popularity (view count).",
    category: "learnit",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query to match against topic title, description, or slug." },
        limit: { type: "number", description: "Max results (default 10)." },
      },
      required: ["query"],
    },
  },
  {
    name: "learnit_get_relations",
    description: "Get relationships for a LearnIt topic: related topics, prerequisites, children, or parent. Filter by type or get all.",
    category: "learnit",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug of the topic to get relations for." },
        type: { type: "string", enum: ["related", "prerequisites", "children", "parent"], description: "Filter by relation type. Omit to get all types." },
      },
      required: ["slug"],
    },
  },
  {
    name: "learnit_list_popular",
    description: "List the most popular published LearnIt topics by view count.",
    category: "learnit",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 10)." },
      },
      required: [],
    },
  },
  {
    name: "learnit_list_recent",
    description: "List the most recently created published LearnIt topics.",
    category: "learnit",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 10)." },
      },
      required: [],
    },
  },
  {
    name: "learnit_get_topic_graph",
    description: "Get the topic graph around a center topic: parent, children, related, and prerequisites in a single call. depth=2 also fetches neighbors' relations (capped at 3).",
    category: "learnit",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug of the center topic." },
        depth: { type: "number", description: "Graph depth: 1=immediate neighbors, 2=neighbors' neighbors (default 1)." },
      },
      required: ["slug"],
    },
  },
  // ── Blog Tools ──
  {
    name: "blog_list_posts",
    description: "List published blog posts with optional filters.",
    category: "blog",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category." },
        tag: { type: "string", description: "Filter by tag." },
        featured: { type: "boolean", description: "Filter featured posts only." },
        limit: { type: "number", description: "Max results (default 20)." },
        offset: { type: "number", description: "Offset for pagination (default 0)." },
      },
      required: [],
    },
  },
  {
    name: "blog_get_post",
    description: "Get a blog post by slug with full content.",
    category: "blog",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Blog post slug." },
      },
      required: ["slug"],
    },
  },
  // ── Career Tools ──
  {
    name: "career_assess_skills",
    description: "Match user skills against occupations in the ESCO database. Returns top matching occupations with match scores and skill gaps.",
    category: "career",
    inputSchema: {
      type: "object",
      properties: {
        skills: {
          type: "array",
          items: {
            type: "object",
            properties: {
              uri: { type: "string", description: "ESCO skill URI" },
              title: { type: "string", description: "Skill name" },
              proficiency: { type: "number", description: "Self-assessed proficiency 1-5" },
            },
            required: ["uri", "title", "proficiency"],
          },
          description: "User's skills with proficiency",
        },
        limit: { type: "number", description: "Max occupations to return (default 10)" },
      },
      required: ["skills"],
    },
  },
  {
    name: "career_search_occupations",
    description: "Search the ESCO occupation database by keyword. Returns occupation titles, URIs, and descriptions.",
    category: "career",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for occupations" },
        limit: { type: "number", description: "Max results (default 20)" },
        offset: { type: "number", description: "Offset for pagination (default 0)" },
      },
      required: ["query"],
    },
  },
  {
    name: "career_get_occupation",
    description: "Get detailed occupation data from ESCO including required skills, ISCO group, and alternative labels.",
    category: "career",
    inputSchema: {
      type: "object",
      properties: {
        uri: { type: "string", description: "ESCO occupation URI" },
      },
      required: ["uri"],
    },
  },
  {
    name: "career_compare_skills",
    description: "Compare user skills against a specific occupation. Shows per-skill gap analysis with priorities.",
    category: "career",
    inputSchema: {
      type: "object",
      properties: {
        skills: {
          type: "array",
          items: {
            type: "object",
            properties: {
              uri: { type: "string", description: "ESCO skill URI" },
              title: { type: "string", description: "Skill name" },
              proficiency: { type: "number", description: "Self-assessed proficiency 1-5" },
            },
            required: ["uri", "title", "proficiency"],
          },
          description: "User's skills",
        },
        occupationUri: { type: "string", description: "ESCO occupation URI to compare against" },
      },
      required: ["skills", "occupationUri"],
    },
  },
  {
    name: "career_get_salary",
    description: "Get salary estimates for an occupation in a specific location.",
    category: "career",
    inputSchema: {
      type: "object",
      properties: {
        occupationTitle: { type: "string", description: "Occupation title for salary lookup" },
        countryCode: { type: "string", description: "ISO country code (default: gb)" },
      },
      required: ["occupationTitle"],
    },
  },
  {
    name: "career_get_jobs",
    description: "Search for job listings from Adzuna matching a query and location.",
    category: "career",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Job search query" },
        location: { type: "string", description: "Location (city or region)" },
        countryCode: { type: "string", description: "ISO country code (default: gb)" },
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Results per page (default 10)" },
      },
      required: ["query"],
    },
  },
  // ── BAZDMEG FAQ Tools ──
  {
    name: "bazdmeg_faq_list",
    description: "List BAZDMEG FAQ entries, optionally filtered by category.",
    category: "bazdmeg",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category (e.g., 'general', 'methodology', 'testing')." },
        include_unpublished: { type: "boolean", description: "Include unpublished entries (admin only)." },
      },
      required: [],
    },
  },
  {
    name: "bazdmeg_faq_create",
    description: "Create a new BAZDMEG FAQ entry.",
    category: "bazdmeg",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The FAQ question." },
        answer: { type: "string", description: "The FAQ answer." },
        category: { type: "string", description: "Category for grouping." },
        sort_order: { type: "number", description: "Display sort order." },
      },
      required: ["question", "answer"],
    },
  },
  {
    name: "bazdmeg_faq_update",
    description: "Update an existing BAZDMEG FAQ entry.",
    category: "bazdmeg",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "FAQ entry ID to update." },
        question: { type: "string", description: "Updated question text." },
        answer: { type: "string", description: "Updated answer text." },
        category: { type: "string", description: "Updated category." },
        sort_order: { type: "number", description: "Updated sort order." },
        is_published: { type: "boolean", description: "Whether the entry is published." },
      },
      required: ["id"],
    },
  },
  {
    name: "bazdmeg_faq_delete",
    description: "Delete a BAZDMEG FAQ entry by ID.",
    category: "bazdmeg",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "FAQ entry ID to delete." },
      },
      required: ["id"],
    },
  },
];

// Build lookup
const TOOL_MAP = new Map(TOOLS.map(t => [t.name, t]));

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const body = await request.json();

    if (body.method === "list_tools") {
      return Response.json({ tools: TOOLS });
    }

    if (body.method === "call_tool") {
      const { toolName, args, userId } = body;
      const tool = TOOL_MAP.get(toolName);
      if (!tool) {
        return Response.json({
          result: {
            content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
            isError: true,
          },
        });
      }

      // Proxy to Next.js backend
      try {
        const nextUrl = env.NEXT_APP_URL || "https://spike.land";
        const response = await fetch(`${nextUrl}/api/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-mcp-user-id": userId || "",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: toolName, arguments: args || {} },
          }),
        });
        const data = await response.json();
        return Response.json({ result: data.result || data });
      } catch (err) {
        return Response.json({
          result: {
            content: [{ type: "text", text: `Error calling ${toolName}: ${err.message}` }],
            isError: true,
          },
        });
      }
    }

    return Response.json({ error: "Unknown method" }, { status: 400 });
  },
};
