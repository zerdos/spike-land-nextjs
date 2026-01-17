import type { ICodeSession } from "@spike-npm-land/code";
import {
  computeSessionHash,
  generateSessionPatch,
  md5,
  sanitizeSession,
} from "@spike-npm-land/code";

import { handleErrors } from "./handleErrors";
// import type { AutoSaveEntry } from "./routeHandler";
import type Env from "./env";
import { McpServer } from "./mcp";
import { RouteHandler } from "./routeHandler";
import { WebSocketHandler } from "./websocketHandler";
import type { WebsocketSession } from "./websocketHandler";

export { md5 };

/**
 * Represents a version snapshot of a codespace.
 * Immutable once created - versions are never modified.
 */
export interface CodeVersion {
  number: number;
  code: string;
  transpiled: string;
  html: string;
  css: string;
  hash: string;
  createdAt: number; // Unix timestamp
}

export class Code implements DurableObject {
  private routeHandler: RouteHandler;
  wsHandler: WebSocketHandler;
  private mcpServer: McpServer;

  private origin = "";
  private logs: ICodeSession[] = [];
  public initialized = false;

  private session: ICodeSession;
  private backupSession: ICodeSession;

  // Version history tracking
  private versionCount = 0;
  // private autoSaveInterval = 60000; // 1 minute in milliseconds
  // private lastAutoSave = 0;
  // private autoSaveHistory: AutoSaveEntry[] = [];

  private xLog: (sess: ICodeSession) => Promise<void>;

  // private historyManager: CodeHistoryManager;
  public getSession() {
    const session = this.session;
    return sanitizeSession(Object.freeze(session)) as ICodeSession;
  }

  /**
   * Save a new version of the code.
   * Creates an immutable snapshot that can be retrieved later.
   */
  private async _saveVersion(session: ICodeSession): Promise<CodeVersion> {
    const hash = computeSessionHash(session);
    const versionNumber = this.versionCount + 1;

    const version: CodeVersion = {
      number: versionNumber,
      code: session.code,
      transpiled: session.transpiled,
      html: session.html,
      css: session.css,
      hash,
      createdAt: Date.now(),
    };

    // Save version to storage
    await this.state.storage.put(`version_${versionNumber}`, version);
    this.versionCount = versionNumber;
    await this.state.storage.put("version_count", versionNumber);

    console.log(
      `[Version] Saved version ${versionNumber} for codeSpace: ${session.codeSpace}`,
    );

    return version;
  }

  /**
   * Get a specific version by number.
   * Returns null if version doesn't exist.
   */
  public async getVersion(versionNumber: number): Promise<CodeVersion | null> {
    const version = await this.state.storage.get<CodeVersion>(
      `version_${versionNumber}`,
    );
    return version || null;
  }

  /**
   * Get the current version count.
   */
  public getVersionCount(): number {
    return this.versionCount;
  }

  /**
   * Get all versions metadata (without full code content for performance).
   */
  public async getVersionsList(): Promise<
    Array<{ number: number; hash: string; createdAt: number; }>
  > {
    const versions: Array<{ number: number; hash: string; createdAt: number; }> = [];

    for (let i = 1; i <= this.versionCount; i++) {
      const version = await this.state.storage.get<CodeVersion>(`version_${i}`);
      if (version) {
        versions.push({
          number: version.number,
          hash: version.hash,
          createdAt: version.createdAt,
        });
      }
    }

    return versions;
  }

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {
    this.env = env;

    // this.historyManager = createCodeHistoryManager(this.env);
    this.xLog = async (c: ICodeSession) => {
      this.logs.push(c);
    }; // this.historyManager.logCodeSpace.bind(this.historyManager);

    this.backupSession = sanitizeSession({
      code: `export default function LandingPage() {
  const features = [
    { icon: "📷", label: "Photos" },
    { icon: "📁", label: "Files" },
    { icon: "💬", label: "Messages" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#fff",
    }}>
      {/* Animated gradient waves */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 50% 0%, rgba(0, 229, 255, 0.15) 0%, transparent 60%)",
        animation: "pulse 4s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)",
        animation: "pulse 5s ease-in-out infinite reverse",
      }} />

      {/* Floating UI elements */}
      <div style={{
        position: "absolute",
        top: "15%",
        left: "10%",
        width: "80px",
        height: "80px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        animation: "float 6s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        top: "25%",
        right: "15%",
        width: "60px",
        height: "60px",
        borderRadius: "12px",
        background: "rgba(0,229,255,0.1)",
        border: "1px solid rgba(0,229,255,0.2)",
        animation: "float 8s ease-in-out infinite reverse",
      }} />
      <div style={{
        position: "absolute",
        bottom: "20%",
        left: "20%",
        width: "100px",
        height: "100px",
        borderRadius: "20px",
        background: "rgba(168,85,247,0.08)",
        border: "1px solid rgba(168,85,247,0.15)",
        animation: "float 7s ease-in-out infinite",
      }} />

      {/* Main content */}
      <div style={{
        position: "relative",
        zIndex: 10,
        textAlign: "center",
        maxWidth: "600px",
        padding: "2rem",
      }}>
        <div style={{
          fontSize: "6rem",
          fontWeight: "bold",
          background: "linear-gradient(135deg, #00e5ff, #a855f7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "1rem",
          lineHeight: 1,
        }}>
          404
        </div>

        <h1 style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#fff",
          marginBottom: "1.5rem",
        }}>
          This space is empty... for now
        </h1>

        <div style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: "16px",
          padding: "1.5rem",
          border: "1px solid rgba(255,255,255,0.1)",
          marginBottom: "2rem",
          backdropFilter: "blur(10px)",
        }}>
          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "1rem", fontSize: "1rem" }}>
            Think of this as your personal development server with{" "}
            <span style={{ color: "#00e5ff", fontWeight: 600 }}>zero startup time</span>.
          </p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
            Send photos, files, or messages and watch as an AI agent transforms this empty canvas into your creation.
          </p>
        </div>

        <div style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          {features.map((item, i) => (
            <div key={i} style={{
              padding: "0.5rem 1rem",
              background: "rgba(0,229,255,0.1)",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: "9999px",
              fontSize: "0.85rem",
              color: "#00e5ff",
              animation: \`fadeIn 0.5s ease-out \${i * 0.1}s both\`,
            }}>
              {item.icon} {item.label}
            </div>
          ))}
        </div>

        <p style={{
          marginTop: "2rem",
          color: "rgba(255,255,255,0.4)",
          fontSize: "0.8rem",
        }}>
          Powered by spike.land
        </p>
      </div>

      <style>{\`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      \`}</style>
    </div>
  );
}`,
      transpiled: "",
      html: "<div></div>",
      css: "",
      codeSpace: "default",
    });

    this.session = this.backupSession;
    this.wsHandler = new WebSocketHandler(this);
    this.routeHandler = new RouteHandler(this);
    this.mcpServer = new McpServer(this);
  }

  getMcpServer() {
    return this.mcpServer;
  }

  private async _saveSession(): Promise<void> {
    return await this.state.blockConcurrencyWhile(async () => {
      const sessionToSave: ICodeSession = this.getSession();

      const { code, transpiled, html, css, ...sessionCoreData } = sessionToSave;
      const codeSpace = sessionToSave.codeSpace;

      if (!codeSpace) {
        console.error(
          "Attempted to save session without a codeSpace:",
          sessionToSave,
        );
        throw new Error("Cannot save session: codeSpace is missing.");
      }

      const r2HtmlKey = `r2_html_${codeSpace}`;
      const r2CssKey = `r2_css_${codeSpace}`;

      const promises = [];
      promises.push(
        this.state.storage.put("session_core", sessionCoreData).catch((e) => {
          console.error(`Failed to save session_core for ${codeSpace}:`, e);
          throw e;
        }),
      );
      promises.push(
        this.state.storage.put("session_code", code || "").catch((e) => {
          console.error(`Failed to save session_code for ${codeSpace}:`, e);
          throw e;
        }),
      );
      promises.push(
        this.state.storage.put("session_transpiled", transpiled || "").catch(
          (e) => {
            console.error(
              `Failed to save session_transpiled for ${codeSpace}:`,
              e,
            );
            throw e;
          },
        ),
      );
      promises.push(
        this.env.R2.put(r2HtmlKey, html || "").catch((e) => {
          console.error(`Failed to save html to R2 for ${r2HtmlKey}:`, e);
          throw e;
        }),
      );
      promises.push(
        this.env.R2.put(r2CssKey, css || "").catch((e) => {
          console.error(`Failed to save css to R2 for ${r2CssKey}:`, e);
          throw e;
        }),
      );

      await Promise.all(promises);
      console.log(`Session for ${codeSpace} saved successfully.`);
    });
  }

  private getCodeSpace(url: URL, request?: Request): string {
    // For MCP requests, try multiple sources for codeSpace
    if (url.pathname.includes("/mcp")) {
      const codeSpace = request?.headers.get("X-CodeSpace") ||
        url.searchParams.get("codeSpace") ||
        url.searchParams.get("room") ||
        "default";
      return codeSpace;
    }

    // For regular requests, use the room parameter
    const codeSpace = url.searchParams.get("room");
    if (!codeSpace) {
      throw new Error("CodeSpace not provided in URL parameters");
    }
    return codeSpace;
  }

  async initializeSession(url: URL, request?: Request) {
    if (this.initialized) return;
    this.origin = url.origin;

    // Initialize with backup session first to ensure we always have a valid state
    this.session = this.backupSession;

    await this.state.blockConcurrencyWhile(async () => {
      //   try {
      if (this.initialized) return;
      this.origin = url.origin;
      const codeSpace = this.getCodeSpace(url, request);

      // Attempt to load session parts (try new key first, then old key for migration)
      let sessionCore = await this.state.storage.get<
        Omit<ICodeSession, "code" | "transpiled" | "html" | "css"> | undefined
      >("session_core");

      // If no data found with new key, try the old key for backward compatibility
      if (!sessionCore) {
        sessionCore = await this.state.storage.get<
          Omit<ICodeSession, "code" | "transpiled" | "html" | "css"> | undefined
        >("session");

        // If we found data with the old key, migrate it to the new key
        if (sessionCore) {
          console.log(
            `Migrating session data from old key for codeSpace: ${codeSpace}`,
          );
          await this.state.storage.put("session_core", sessionCore);
          await this.state.storage.delete("session"); // Clean up old key
        }
      }
      let loadedSession: ICodeSession | null = null;

      if (sessionCore && sessionCore.codeSpace === codeSpace) { // Ensure loaded core is for the correct codespace
        const code = await this.state.storage.get<string>("session_code") ??
          sessionCore.code;
        const transpiled = await this.state.storage.get<string>("session_transpiled") ??
          sessionCore.transpiled;

        const r2HtmlKey = `r2_html_${codeSpace}`;
        const r2CssKey = `r2_css_${codeSpace}`;

        let html = "";
        try {
          const htmlObject = await this.env.R2.get(r2HtmlKey);
          if (htmlObject) html = await htmlObject.text();
        } catch (e) {
          console.error(`Failed to load html from R2 (${r2HtmlKey}):`, e);
        }

        let css = "";
        try {
          const cssObject = await this.env.R2.get(r2CssKey);
          if (cssObject) css = await cssObject.text();
        } catch (e) {
          console.error(`Failed to load css from R2 (${r2CssKey}):`, e);
        }

        loadedSession = {
          ...sessionCore, // Contains messages, original codeSpace, etc.
          code,
          transpiled,
          html,

          css,
        };
      } else if (sessionCore && sessionCore.codeSpace !== codeSpace) {
        console.warn(
          `Loaded session_core for ${sessionCore.codeSpace} but current room is ${codeSpace}. Discarding loaded core.`,
        );
        // This case will fall through to the 'else' block below, treating it as no session found.
      }

      if (loadedSession) {
        // Ensure the codeSpace from the URL is respected, sanitizeSession handles merging.
        this.session = sanitizeSession({ ...loadedSession, codeSpace });
      } else {
        // No valid stored session found, or codespace mismatch, initialize a new one
        const codeSpaceParts = codeSpace!.split("-");
        if (codeSpaceParts.length > 2) {
          throw new Error("Invalid codeSpace");
        }

        if (codeSpaceParts[0] === "x") {
          // full empty state
          this.session = sanitizeSession({
            codeSpace,
            code: `export default () => (<>Write your code here!</>);
              `,
            html: "<div>Write your code here!</div>",
            css: "",
          });
        } else {
          // Don't fetch from ourselves - use a default template instead
          const codeSpaceParts = codeSpace!.split("-");

          if (codeSpaceParts.length === 2 && codeSpaceParts[0] !== "code") {
            // For derived codespaces (like "code-main" derived from "code"),
            // try to get the base template from a different Durable Object instance
            try {
              const baseCodeSpace = codeSpaceParts[0];
              // Only fetch if it's not the same as our current codeSpace to avoid recursion
              if (baseCodeSpace !== codeSpace) {
                const source = `${this.origin}/live/${baseCodeSpace}/session.json`;
                const response = await fetch(source);
                if (response.ok) {
                  const backupCode = await response.json() as ICodeSession;
                  this.backupSession = sanitizeSession({
                    ...backupCode,
                    codeSpace,
                  });
                } else {
                  throw new Error(
                    `Failed to fetch base session: ${response.status}`,
                  );
                }
              } else {
                throw new Error("Circular reference avoided");
              }
            } catch (error) {
              console.error(
                "Error fetching backup code from base codeSpace:",
                error,
              );
              // Use default backup session if fetch fails
              this.backupSession = sanitizeSession({
                codeSpace,
                code: `export default () => (<>Write your code here!</>);`,
                html: "<div>Write your code here!</div>",
                css: "",
              });
            }
          } else {
            // For base codespaces or single-part names, use default template
            this.backupSession = sanitizeSession({
              codeSpace,
              code: `export default () => (<>Write your code here!</>);`,
              html: "<div>Write your code here!</div>",
              css: "",
            });
          }

          this.session = this.backupSession;
        }

        // this.state.storage.put("session", this.backupSession); // Old logic
      }

      // Initialize auto-save history
      // this.state.storage.get<AutoSaveEntry[]>("autoSaveHistory").then(
      //   (savedHistory) => {
      //     if (savedHistory) {
      //       this.autoSaveHistory = savedHistory;
      //     }
      //   },
      // );
      // } catch (_error) {
      //   console.error("Error initializing session:", _error);
      //   this.session = this.backupSession;
      // } finally {
      this.initialized = true;

      // Load version count from storage
      const storedVersionCount = await this.state.storage.get<number>(
        "version_count",
      );
      if (storedVersionCount) {
        this.versionCount = storedVersionCount;
        console.log(
          `[Version] Loaded version count: ${this.versionCount} for codeSpace: ${codeSpace}`,
        );
      }

      if (this.session) {
        this.xLog(this.session);
      }
      // }
    });

    await this._saveSession();
  }

  // private setupAutoSave() {
  // setInterval(() => this.autoSave(), this.autoSaveInterval);
  // }

  // public async autoSave() {
  //   const currentTime = Date.now();
  //   if (currentTime - this.lastAutoSave < this.autoSaveInterval) return;

  //   const currentCode = this.session.code;
  //   // const lastEntry = this.autoSaveHistory[this.autoSaveHistory.length - 1];

  //   if (!lastEntry || currentCode !== lastEntry.code) {
  //     // Remove entries younger than 1 minute and older than 2 months in one pass
  //     const oneMinuteAgo = currentTime - 60_000;
  //     const twoMonthsAgo = currentTime - 60000 * 60 * 24 * 60;

  //     // this.autoSaveHistory = this.autoSaveHistory.filter((entry) =>
  //       // entry.timestamp <= oneMinuteAgo && entry.timestamp > twoMonthsAgo
  //     // );

  //     // Add new entry
  //     // this.autoSaveHistory.push({
  //     //   timestamp: currentTime,
  //     //   code: currentCode,
  //     // });

  //     // Save the updated history
  //     // this.state.storage.put("autoSaveHistory", this.autoSaveHistory);

  //     // Save the current version with timestamp
  //     this.state.storage.put(`savedVersion_${currentTime}`, currentCode);

  //     // Update last auto-save time
  //     this.lastAutoSave = currentTime;

  //     console.warn("Auto-saved code at", new Date(currentTime).toISOString());
  //   }
  // }

  async fetch(request: Request): Promise<Response> {
    return handleErrors(request, async () => {
      const url = new URL(request.url);
      const path = url.pathname.slice(1).split("/");
      this.origin = url.origin;

      // Only initialize session for routes that need it
      if (!this.initialized && path[0] !== "websocket" && path[0] !== "users") {
        try {
          await this.initializeSession(url, request);
        } catch (_error) {
          console.error("Session initialization error:", _error);
          // Continue with backup session
        }
      }

      // For MCP requests, we'll handle codeSpace initialization differently
      // The MCP server will extract codeSpace from the JSON payload
      if (path[0] === "mcp") {
        // If not initialized, initialize with default codeSpace
        if (!this.initialized) {
          console.log(
            "Initializing session for MCP request with default codeSpace",
          );
          this.initialized = false;
          try {
            await this.initializeSession(url, request);
          } catch (_error) {
            console.error("MCP session initialization error:", _error);
            // Continue with current session
          }
        }
      }

      if (request.method === "POST" && request.url.endsWith("/session")) {
        try {
          const newSession = await request.json();
          this.updateAndBroadcastSession(newSession);
        } catch (_error) {
          return new Response("Invalid session data", { status: 400 });
        }
      }

      // Handle MCP server routes
      if (path[0] === "mcp") {
        return this.mcpServer.handleRequest(request, url, path);
      }

      return this.routeHandler.handleRoute(request, url, path);
    });
  }

  // async updateSessionStorage(msg: SessionDelta) {
  //   if (!this.session.codeSpace) {
  //     throw new Error("CodeSpace not set");
  //   }

  //   // const head = computeSessionHash(this.session);

  //   // this.xLog(this.session);
  //   // this.state.storage.put(head, {
  //   //   ...this.session,
  //   //   oldHash: msg.oldHash,
  //   //   reversePatch: msg.reversePatch,
  //   // });

  //   // const oldData = await this.state.storage.get(msg.oldHash) as {
  //   //   oldHash?: string;
  //   //   reversePatch?: string;
  //   // } | null;
  //   // this.state.storage.put(msg.oldHash, {
  //   //   oldHash: oldData?.oldHash || "",
  //   //   reversePatch: oldData?.reversePatch || [],
  //   //   hashCode: msg.hashCode,
  //   //   patch: msg.patch,
  //   // });

  //   // this.state.storage.put("head", head);

  //   // Trigger auto-save after updating session storage
  //   // this.autoSave();
  // }

  async updateAndBroadcastSession( // Add async keyword
    newSession: ICodeSession,
    wsSession?: WebsocketSession,
  ) {
    const oldSession = this.getSession();
    const oldHash = computeSessionHash(oldSession);
    const hashCode = computeSessionHash(newSession);

    console.log(
      `[updateAndBroadcastSession] Called for codeSpace: ${newSession.codeSpace}`,
    );
    console.log(
      `[updateAndBroadcastSession] Old hash: ${oldHash}, New hash: ${hashCode}`,
    );

    if (oldHash === hashCode) {
      console.log(
        `[updateAndBroadcastSession] No changes detected, skipping broadcast`,
      );
      return; // No change needed
    }

    console.log(
      `[updateAndBroadcastSession] Changes detected, saving session...`,
    );
    // Attempt to save the new session parts first and wait for them to complete

    // If save is successful (i.e., did not throw), update in-memory state and broadcast
    this.session = newSession;
    await this._saveSession();

    const patch = generateSessionPatch(oldSession, newSession);

    // Save a new version if code or transpiled changed (meaningful code changes)
    const codeChanged = oldSession.code !== newSession.code;
    const transpiledChanged = oldSession.transpiled !== newSession.transpiled;

    if (codeChanged || transpiledChanged) {
      try {
        const version = await this._saveVersion(newSession);
        console.log(
          `[updateAndBroadcastSession] Created version ${version.number}`,
        );
      } catch (e) {
        console.error(`[updateAndBroadcastSession] Failed to save version:`, e);
        // Don't fail the update if versioning fails
      }
    }

    console.log(
      `[updateAndBroadcastSession] Broadcasting patch to WebSocket clients`,
    );
    console.log(
      `[updateAndBroadcastSession] Patch includes code change: ${patch.delta?.code !== undefined}`,
    );
    console.log(
      `[updateAndBroadcastSession] Patch includes transpiled change: ${
        patch.delta?.transpiled !== undefined
      }`,
    );
    console.log(
      `[updateAndBroadcastSession] Active WebSocket sessions: ${this.wsHandler.getWsSessions().length}`,
    );

    this.wsHandler.broadcast(patch, wsSession);
  }

  getState() {
    return this.state;
  }

  getOrigin() {
    return this.origin;
  }

  getEnv() {
    return this.env;
  }

  // async getAutoSaveHistory(): Promise<AutoSaveEntry[]> {
  //   return this.autoSaveHistory;
  // }

  // async setAutoSaveHistory(history: AutoSaveEntry[]): Promise<AutoSaveEntry[]> {
  //   return this.autoSaveHistory = history;
  // }

  // async restoreFromAutoSave(timestamp: number): Promise<boolean> {
  //   const entry = this.autoSaveHistory.find((e) => e.timestamp === timestamp);
  //   if (entry) {
  //     this.updateAndBroadcastSession({
  //       ...this.session,
  //       code: entry.code,
  //     });
  //     return true;
  //   }
  //   return false;
  // }
}
