// MCP Domain Worker: Billing
// Handles: credits, billing, merch

const TOOLS = [
  // ── Credits Tools ──
  {
    name: "credits_get_balance",
    description: "Get current user's AI credit balance including remaining credits, monthly limit, usage, and subscription tier.",
    category: "credits",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── Billing Tools ──
  {
    name: "billing_create_checkout",
    description: "Create a Stripe checkout session for purchasing tokens, subscribing to a plan, or upgrading workspace tier.",
    category: "billing",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["tokens", "subscription", "workspace_tier"], description: "Checkout type: tokens (one-time), subscription (recurring), or workspace_tier (workspace upgrade)." },
        workspace_id: { type: "string", description: "Workspace ID to associate the checkout with." },
      },
      required: ["type", "workspace_id"],
    },
  },
  {
    name: "billing_get_subscription",
    description: "Get current subscription status and tier information for the user's workspace.",
    category: "billing",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // ── Merch Tools ──
  {
    name: "merch_list_products",
    description: "List available merchandise products for a workspace.",
    category: "merch",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        limit: { type: "number", description: "Max products to return (default 20)." },
      },
      required: ["workspace_slug"],
    },
  },
  {
    name: "merch_add_to_cart",
    description: "Add a product variant to the shopping cart.",
    category: "merch",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        variant_id: { type: "string", description: "Product variant ID to add." },
        quantity: { type: "number", description: "Quantity to add (default 1)." },
      },
      required: ["workspace_slug", "variant_id"],
    },
  },
  {
    name: "merch_checkout",
    description: "Checkout a cart and create an order.",
    category: "merch",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        cart_id: { type: "string", description: "Cart ID to checkout." },
        shipping_address: { type: "string", description: "Shipping address for the order." },
      },
      required: ["workspace_slug", "cart_id", "shipping_address"],
    },
  },
  {
    name: "merch_get_order",
    description: "Get details of a merchandise order.",
    category: "merch",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        order_id: { type: "string", description: "Order ID to retrieve." },
      },
      required: ["workspace_slug", "order_id"],
    },
  },
  {
    name: "merch_track_shipment",
    description: "Track shipment status for a merchandise order.",
    category: "merch",
    inputSchema: {
      type: "object",
      properties: {
        workspace_slug: { type: "string", description: "Workspace slug." },
        order_id: { type: "string", description: "Order ID to track shipment for." },
      },
      required: ["workspace_slug", "order_id"],
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
