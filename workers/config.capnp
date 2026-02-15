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
        globalOutbound = "internet",
      )
    ),

    # --- Transpiler: code transpilation service ---
    ( name = "transpiler",
      worker = (
        compatibilityDate = "2024-12-01",
        compatibilityFlags = ["nodejs_compat_v2"],
        modules = [
          (name = "worker", esModule = embed "services/transpiler/index.js"),
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
