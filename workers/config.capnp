using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    # --- API Gateway: main entry point, routes to all other services ---
    ( name = "api-gateway",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/api-gateway/index.js"),
        ],
        bindings = [
          (name = "COLLAB", service = "collab"),
          (name = "TRANSPILER", service = "transpiler"),
          (name = "STORAGE_PROXY", service = "storage-proxy"),
          (name = "AI_PROXY", service = "ai-proxy"),
          (name = "AUTH_WORKER", service = "auth-worker"),
          (name = "MCP_GATEWAY", service = "mcp-gateway"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- Collab: real-time collaboration, WebSocket, session state ---
    ( name = "collab",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/collab/index.js"),
        ],
        bindings = [
          (name = "REDIS_URL", text = ""),
          (name = "REDIS_TOKEN", text = ""),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- Transpiler: code transpilation service (esbuild-wasm) ---
    ( name = "transpiler",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/transpiler/index.js"),
          (name = "esbuild-wasm-module", wasmModule = embed "services/transpiler/esbuild.wasm"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- Storage Proxy: KV/R2-style API backed by DynamoDB/S3 ---
    ( name = "storage-proxy",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/storage-proxy/index.js"),
        ],
        bindings = [
          (name = "AWS_ACCESS_KEY_ID", text = ""),
          (name = "AWS_SECRET_ACCESS_KEY", text = ""),
          (name = "AWS_REGION", text = "us-east-1"),
          (name = "DYNAMODB_TABLE", text = "spike-land-kv"),
          (name = "S3_BUCKET", text = "spike-land-storage"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- AI Proxy: forwards requests to OpenAI, Anthropic, Replicate ---
    ( name = "ai-proxy",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/ai-proxy/index.js"),
        ],
        bindings = [
          (name = "OPENAI_API_KEY", text = ""),
          (name = "ANTHROPIC_API_KEY", text = ""),
          (name = "REPLICATE_API_TOKEN", text = ""),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- Auth Worker: JWT validation and session management ---
    ( name = "auth-worker",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/auth-worker/index.js"),
        ],
        bindings = [
          (name = "JWT_SECRET", text = "dev-secret"),
          (name = "AUTH_ISSUER", text = "spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Gateway: progressive disclosure + tool routing ---
    ( name = "mcp-gateway",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-gateway/index.js"),
          (name = "mcp-shared/domains", esModule = embed "services/mcp-shared/domains.js"),
          (name = "mcp-shared/protocol", esModule = embed "services/mcp-shared/protocol.js"),
        ],
        bindings = [
          (name = "AUTH_WORKER", service = "auth-worker"),
          (name = "MCP_IMAGE", service = "mcp-image"),
          (name = "MCP_APPS", service = "mcp-apps"),
          (name = "MCP_SOCIAL", service = "mcp-social"),
          (name = "MCP_ANALYTICS", service = "mcp-analytics"),
          (name = "MCP_BRAND", service = "mcp-brand"),
          (name = "MCP_PAGES", service = "mcp-pages"),
          (name = "MCP_MEDIA", service = "mcp-media"),
          (name = "MCP_KNOWLEDGE", service = "mcp-knowledge"),
          (name = "MCP_ORCHESTRATION", service = "mcp-orchestration"),
          (name = "MCP_AGENTS", service = "mcp-agents"),
          (name = "MCP_WORKSPACE", service = "mcp-workspace"),
          (name = "MCP_BILLING", service = "mcp-billing"),
          (name = "MCP_COMMS", service = "mcp-comms"),
          (name = "MCP_DEVOPS", service = "mcp-devops"),
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Image: AI image generation, enhancement, batch, pipelines ---
    ( name = "mcp-image",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-image/index.js"),
        ],
        bindings = [
          (name = "AI_PROXY", service = "ai-proxy"),
          (name = "STORAGE_PROXY", service = "storage-proxy"),
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Apps: my-apps CRUD, deploy, version management ---
    ( name = "mcp-apps",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-apps/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Social: posts, comments, likes, follow, feed ---
    ( name = "mcp-social",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-social/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Analytics: events, dashboards, metrics ---
    ( name = "mcp-analytics",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-analytics/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Brand: theme, logo, color palette, typography ---
    ( name = "mcp-brand",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-brand/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Pages: CMS page CRUD, templates, publishing ---
    ( name = "mcp-pages",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-pages/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Media: upload, transcode, CDN, galleries ---
    ( name = "mcp-media",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-media/index.js"),
        ],
        bindings = [
          (name = "STORAGE_PROXY", service = "storage-proxy"),
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Knowledge: RAG, embeddings, document search ---
    ( name = "mcp-knowledge",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-knowledge/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Orchestration: multi-step workflows, pipelines ---
    ( name = "mcp-orchestration",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-orchestration/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Agents: agent CRUD, execution, monitoring ---
    ( name = "mcp-agents",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-agents/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Workspace: project settings, members, permissions ---
    ( name = "mcp-workspace",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-workspace/index.js"),
        ],
        bindings = [
          (name = "AUTH_WORKER", service = "auth-worker"),
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Billing: subscriptions, tokens, usage, invoices ---
    ( name = "mcp-billing",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-billing/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP Comms: notifications, email, webhooks ---
    ( name = "mcp-comms",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-comms/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- MCP DevOps: CI/CD, deployments, logs, monitoring ---
    ( name = "mcp-devops",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/mcp-devops/index.js"),
        ],
        bindings = [
          (name = "NEXT_APP_URL", text = "https://spike.land"),
        ],
        globalOutbound = "internet",
      )
    ),

    # --- Internet: outbound network access ---
    ( name = "internet",
      network = (
        allow = ["public"],
        tlsOptions = (trustBrowserCas = true),
      )
    ),
  ],

  sockets = [
    ( name = "http",
      address = "*:8080",
      http = (),
      service = "api-gateway",
    ),
  ],
);
