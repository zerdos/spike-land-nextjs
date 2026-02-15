// MCP Domain Worker: Media
// Handles: album-management, album-images, gallery, audio, assets, storage

const TOOLS = [
  // ── album-management ──
  {
    name: "album_create",
    description: "Create a new image album with name, description, privacy, and default enhancement tier.",
    category: "album-management",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1, maxLength: 100, description: "Album name (max 100 characters)." },
        description: { type: "string", maxLength: 500, description: "Optional album description." },
        privacy: {
          type: "string",
          enum: ["PRIVATE", "UNLISTED", "PUBLIC"],
          default: "PRIVATE",
          description: "Album privacy. Default: PRIVATE.",
        },
        default_tier: {
          type: "string",
          enum: ["TIER_1K", "TIER_2K", "TIER_4K"],
          default: "TIER_1K",
          description: "Default enhancement tier. Default: TIER_1K.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "album_list",
    description: "List the user's albums with image counts and metadata.",
    category: "album-management",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, maximum: 50, default: 20, description: "Max albums to return. Default: 20." },
      },
      required: [],
    },
  },
  {
    name: "album_get",
    description: "Get detailed information about a specific album including image count and settings.",
    category: "album-management",
    inputSchema: {
      type: "object",
      properties: {
        album_id: { type: "string", minLength: 1, description: "Album ID to retrieve." },
      },
      required: ["album_id"],
    },
  },
  {
    name: "album_update",
    description: "Update an album's name, description, privacy, or default tier.",
    category: "album-management",
    inputSchema: {
      type: "object",
      properties: {
        album_id: { type: "string", minLength: 1, description: "Album ID to update." },
        name: { type: "string", minLength: 1, maxLength: 100, description: "New album name." },
        description: { type: "string", maxLength: 500, description: "New album description." },
        privacy: {
          type: "string",
          enum: ["PRIVATE", "UNLISTED", "PUBLIC"],
          description: "New privacy setting.",
        },
        default_tier: {
          type: "string",
          enum: ["TIER_1K", "TIER_2K", "TIER_4K"],
          description: "New default enhancement tier.",
        },
      },
      required: ["album_id"],
    },
  },
  {
    name: "album_delete",
    description: "Delete an album. Images are not deleted but unlinked from the album.",
    category: "album-management",
    inputSchema: {
      type: "object",
      properties: {
        album_id: { type: "string", minLength: 1, description: "Album ID to delete." },
      },
      required: ["album_id"],
    },
  },
  {
    name: "album_get_share_url",
    description: "Get a shareable URL for a public or unlisted album.",
    category: "album-management",
    inputSchema: {
      type: "object",
      properties: {
        album_id: { type: "string", minLength: 1, description: "Album ID to get share URL for." },
      },
      required: ["album_id"],
    },
  },

  // ── album-images ──
  {
    name: "album_images_add",
    description: "Add images to an album. Images are appended after the current last image. Duplicates are silently skipped.",
    category: "album-images",
    inputSchema: {
      type: "object",
      properties: {
        album_id: { type: "string", minLength: 1, description: "Album ID to add images to." },
        image_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 50,
          description: "Image IDs to add to the album.",
        },
      },
      required: ["album_id", "image_ids"],
    },
  },
  {
    name: "album_images_remove",
    description: "Remove images from an album. The images themselves are not deleted.",
    category: "album-images",
    inputSchema: {
      type: "object",
      properties: {
        album_id: { type: "string", minLength: 1, description: "Album ID to remove images from." },
        image_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 50,
          description: "Image IDs to remove from the album.",
        },
      },
      required: ["album_id", "image_ids"],
    },
  },
  {
    name: "album_images_reorder",
    description: "Reorder images within an album by providing the new image ID order.",
    category: "album-images",
    inputSchema: {
      type: "object",
      properties: {
        album_id: { type: "string", minLength: 1, description: "Album ID to reorder images in." },
        image_order: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          description: "Ordered array of image IDs representing the new sort order.",
        },
      },
      required: ["album_id", "image_order"],
    },
  },
  {
    name: "album_images_list",
    description: "List all images in an album with their metadata and enhancement status.",
    category: "album-images",
    inputSchema: {
      type: "object",
      properties: {
        album_id: { type: "string", minLength: 1, description: "Album ID to list images from." },
      },
      required: ["album_id"],
    },
  },
  {
    name: "album_images_move",
    description: "Move images from one album to another.",
    category: "album-images",
    inputSchema: {
      type: "object",
      properties: {
        source_album_id: { type: "string", minLength: 1, description: "Album to move images from." },
        target_album_id: { type: "string", minLength: 1, description: "Album to move images to." },
        image_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 50,
          description: "Image IDs to move between albums.",
        },
      },
      required: ["source_album_id", "target_album_id", "image_ids"],
    },
  },

  // ── gallery ──
  {
    name: "gallery_list",
    description: "Returns active featured gallery items for the landing page.",
    category: "gallery",
    inputSchema: {
      type: "object",
      properties: {
        activeOnly: { type: "boolean", default: true, description: "Only return active items." },
      },
      required: [],
    },
  },
  {
    name: "gallery_public",
    description: "Browse publicly available enhanced images with pagination and tag filtering.",
    category: "gallery",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", default: 1, description: "Page number." },
        limit: { type: "number", maximum: 100, default: 20, description: "Results per page." },
        tags: { type: "array", items: { type: "string" }, default: [], description: "Filter by tags." },
        tier: { type: "string", description: "Filter by enhancement tier." },
      },
      required: [],
    },
  },
  {
    name: "gallery_public_albums",
    description: "List publicly available albums.",
    category: "gallery",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 12, description: "Max albums to return." },
      },
      required: [],
    },
  },

  // ── audio ──
  {
    name: "audio_upload",
    description: "Upload an audio track to a mixer project. Creates a track record and returns track metadata.",
    category: "audio",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", minLength: 1, description: "Audio mixer project ID." },
        filename: { type: "string", minLength: 1, description: "Filename for the audio track." },
        content_type: { type: "string", minLength: 1, description: "MIME content type (e.g. audio/wav)." },
      },
      required: ["project_id", "filename", "content_type"],
    },
  },
  {
    name: "audio_get_track",
    description: "Get metadata and details for a specific audio track.",
    category: "audio",
    inputSchema: {
      type: "object",
      properties: {
        track_id: { type: "string", minLength: 1, description: "Audio track ID." },
      },
      required: ["track_id"],
    },
  },

  // ── assets ──
  {
    name: "asset_upload",
    description: "Register a new digital asset in the workspace asset library.",
    category: "assets",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        filename: { type: "string", minLength: 1, description: "Asset filename." },
        r2_key: { type: "string", minLength: 1, description: "R2 object key for the asset." },
        r2_bucket: { type: "string", minLength: 1, description: "R2 bucket name." },
        file_type: { type: "string", minLength: 1, description: "File type of the asset (e.g. image/png)." },
        size_bytes: { type: "number", minimum: 0, description: "File size in bytes." },
        folder_id: { type: "string", description: "Optional folder ID to place the asset in." },
      },
      required: ["workspace_slug", "filename", "r2_key", "r2_bucket", "file_type", "size_bytes"],
    },
  },
  {
    name: "asset_list",
    description: "List assets in a workspace with optional folder and file type filters.",
    category: "assets",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        folder_id: { type: "string", description: "Filter by folder ID." },
        file_type: { type: "string", description: "Filter by file type prefix (e.g. image/)." },
        limit: { type: "number", default: 20, description: "Max items to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "asset_search",
    description: "Search assets by filename in a workspace.",
    category: "assets",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        query: { type: "string", minLength: 1, description: "Search query to match against asset filenames." },
        limit: { type: "number", default: 20, description: "Max results to return (default 20)." },
      },
      required: ["workspace_slug", "query"],
    },
  },
  {
    name: "asset_organize",
    description: "Move multiple assets into a folder.",
    category: "assets",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        asset_ids: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          description: "Array of asset IDs to move.",
        },
        folder_id: { type: "string", minLength: 1, description: "Target folder ID." },
      },
      required: ["workspace_slug", "asset_ids", "folder_id"],
    },
  },
  {
    name: "asset_tag",
    description: "Apply tags to a digital asset.",
    category: "assets",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", minLength: 1, description: "Workspace slug." },
        asset_id: { type: "string", minLength: 1, description: "Asset ID to tag." },
        tags: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          description: "Tags to apply to the asset.",
        },
      },
      required: ["workspace_slug", "asset_id", "tags"],
    },
  },

  // ── storage ──
  {
    name: "storage_get_upload_url",
    description: "Get a presigned URL for uploading a file to R2.",
    category: "storage",
    inputSchema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Original filename." },
        content_type: { type: "string", description: "MIME type of the file." },
        purpose: {
          type: "string",
          enum: ["image", "audio", "asset", "brand"],
          description: "Purpose of the upload.",
        },
      },
      required: ["filename", "content_type", "purpose"],
    },
  },
  {
    name: "storage_register_upload",
    description: "Register a completed upload and create a database record.",
    category: "storage",
    inputSchema: {
      type: "object",
      properties: {
        r2_key: { type: "string", description: "The key returned by storage_get_upload_url." },
        purpose: {
          type: "string",
          enum: ["image", "audio", "asset", "brand"],
          description: "Purpose of the upload.",
        },
        metadata: { type: "object", description: "Additional metadata." },
      },
      required: ["r2_key", "purpose"],
    },
  },
];

// Build lookup
const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

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
