/**
 * CodeSpace API Client for MCP Server
 *
 * HTTP client for communicating with testing.spike.land CodeSpace API.
 * Enables creating, updating, and managing live React applications.
 */

const DEFAULT_BASE_URL = "https://testing.spike.land";
const SPIKE_LAND_BASE_URL = "https://spike.land";

/**
 * Pattern for validating codespace IDs (alphanumeric with hyphens and underscores)
 */
const CODESPACE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate codespace ID format to prevent path traversal attacks
 * @throws Error if codespace ID format is invalid
 */
function validateCodeSpaceId(codeSpaceId: string): void {
  if (!CODESPACE_ID_PATTERN.test(codeSpaceId)) {
    throw new Error(`Invalid codespace ID format: ${codeSpaceId}`);
  }
}

interface UpdateCodeRequest {
  code: string;
  run?: boolean;
}

interface UpdateCodeResponse {
  success: boolean;
  codeSpace: string;
  hash: string;
  updated: string[];
  error?: string;
}

interface RunResponse {
  success: boolean;
  codeSpace: string;
  hash: string;
  transpiled: boolean;
  error?: string;
}

interface SessionResponse {
  codeSpace: string;
  code: string;
  transpiled?: string;
  hash: string;
  createdAt?: string;
  updatedAt?: string;
  error?: string;
}

// My-Apps API types
interface AppResponse {
  id: string;
  name: string;
  description?: string;
  status: string;
  codespaceId?: string;
  codespaceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppCreateRequest {
  name: string;
  description: string;
  requirements: string;
  monetizationModel: string;
  codespaceId?: string;
}

interface AppLinkRequest {
  codespaceId: string;
}

export class CodeSpaceClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || process.env.TESTING_SPIKE_LAND_URL || DEFAULT_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ data: T | null; error: string | null; }> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      // Handle screenshot binary response
      if (endpoint.includes("/screenshot")) {
        if (!response.ok) {
          const text = await response.text();
          return { data: null, error: text || `API error: ${response.status}` };
        }
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return { data: { base64, mimeType: "image/jpeg" } as T, error: null };
      }

      const json = await response.json();

      if (!response.ok) {
        const error = (json as { error?: string; })?.error ||
          `API error: ${response.status}`;
        return { data: null, error };
      }

      return { data: json as T, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update code in a codespace (creates if doesn't exist)
   */
  async updateCode(
    codeSpaceId: string,
    code: string,
    run = true,
  ): Promise<{ data: UpdateCodeResponse | null; error: string | null; }> {
    validateCodeSpaceId(codeSpaceId);
    return this.request<UpdateCodeResponse>(`/api/${codeSpaceId}/code`, {
      method: "PUT",
      body: JSON.stringify({ code, run } as UpdateCodeRequest),
    });
  }

  /**
   * Transpile and trigger render
   */
  async run(
    codeSpaceId: string,
  ): Promise<{ data: RunResponse | null; error: string | null; }> {
    validateCodeSpaceId(codeSpaceId);
    return this.request<RunResponse>(`/api/${codeSpaceId}/run`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  /**
   * Get screenshot of the codespace
   */
  async getScreenshot(
    codeSpaceId: string,
  ): Promise<{ data: { base64: string; mimeType: string; } | null; error: string | null; }> {
    validateCodeSpaceId(codeSpaceId);
    return this.request<{ base64: string; mimeType: string; }>(
      `/api/${codeSpaceId}/screenshot`,
    );
  }

  /**
   * Get full session data (code, transpiled, metadata)
   */
  async getSession(
    codeSpaceId: string,
  ): Promise<{ data: SessionResponse | null; error: string | null; }> {
    validateCodeSpaceId(codeSpaceId);
    return this.request<SessionResponse>(`/api/${codeSpaceId}/session`);
  }

  /**
   * Get the live URL for a codespace
   */
  getLiveUrl(codeSpaceId: string): string {
    return `${this.baseUrl}/live/${codeSpaceId}`;
  }

  // ========================================
  // My-Apps API Methods (spike.land)
  // ========================================

  private async requestSpikeLand<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ data: T | null; error: string | null; }> {
    try {
      const url = `${SPIKE_LAND_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const json = await response.json();

      if (!response.ok) {
        const error = (json as { error?: string; })?.error ||
          `API error: ${response.status}`;
        return { data: null, error };
      }

      return { data: json as T, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List user's apps from spike.land
   */
  async listApps(): Promise<{ data: AppResponse[] | null; error: string | null; }> {
    return this.requestSpikeLand<AppResponse[]>("/api/apps");
  }

  /**
   * Create a new app with optional codespace link
   */
  async createApp(
    request: AppCreateRequest,
  ): Promise<{ data: AppResponse | null; error: string | null; }> {
    return this.requestSpikeLand<AppResponse>("/api/apps", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Link a codespace to an existing app
   */
  async linkCodespaceToApp(
    appId: string,
    codespaceId: string,
  ): Promise<{ data: AppResponse | null; error: string | null; }> {
    return this.requestSpikeLand<AppResponse>(`/api/apps/${appId}`, {
      method: "PATCH",
      body: JSON.stringify({ codespaceId } as AppLinkRequest),
    });
  }

  /**
   * Get a single app by ID
   */
  async getApp(appId: string): Promise<{ data: AppResponse | null; error: string | null; }> {
    return this.requestSpikeLand<AppResponse>(`/api/apps/${appId}`);
  }
}
