/**
 * Jules API Client for MCP Server
 *
 * Lightweight client for the Jules async coding agent API.
 */

const JULES_BASE_URL = "https://jules.googleapis.com/v1alpha";

export interface JulesSession {
  name: string;
  id?: string;
  state: string;
  createTime?: string;
  updateTime?: string;
  url?: string;
  title?: string;
  outputs?: Array<{ url?: string; title?: string; description?: string; }>;
  planSummary?: string;
}

export interface JulesActivity {
  name: string;
  type?: string;
  content?: string;
  createTime?: string;
}

export interface JulesSourceContext {
  source: string;
  githubRepoContext?: {
    startingBranch?: string;
  };
}

export interface CreateSessionRequest {
  prompt: string;
  sourceContext: JulesSourceContext;
  title?: string;
  requirePlanApproval?: boolean;
}

export class JulesClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ data: T | null; error: string | null; }> {
    try {
      const url = `${JULES_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          "X-Goog-Api-Key": this.apiKey,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const json = await response.json();

      if (!response.ok) {
        const error = (json as { error?: { message?: string; }; })?.error?.message ||
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

  async listSessions(pageSize = 20, pageToken?: string): Promise<{
    data: { sessions: JulesSession[]; nextPageToken?: string; } | null;
    error: string | null;
  }> {
    const params = new URLSearchParams();
    if (pageSize) params.set("pageSize", String(pageSize));
    if (pageToken) params.set("pageToken", pageToken);

    const query = params.toString();
    return this.request(`/sessions${query ? `?${query}` : ""}`);
  }

  async getSession(sessionName: string): Promise<{
    data: JulesSession | null;
    error: string | null;
  }> {
    const name = sessionName.startsWith("sessions/")
      ? sessionName
      : `sessions/${sessionName}`;
    return this.request(`/${name}`);
  }

  async createSession(request: CreateSessionRequest): Promise<{
    data: JulesSession | null;
    error: string | null;
  }> {
    return this.request("/sessions", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async approvePlan(sessionName: string): Promise<{
    data: JulesSession | null;
    error: string | null;
  }> {
    const name = sessionName.startsWith("sessions/")
      ? sessionName
      : `sessions/${sessionName}`;
    return this.request(`/${name}:approvePlan`, {
      method: "POST",
    });
  }

  async sendMessage(sessionName: string, message: string): Promise<{
    data: JulesSession | null;
    error: string | null;
  }> {
    const name = sessionName.startsWith("sessions/")
      ? sessionName
      : `sessions/${sessionName}`;
    return this.request(`/${name}:sendMessage`, {
      method: "POST",
      body: JSON.stringify({ prompt: message }),
    });
  }

  async listActivities(
    sessionName: string,
    pageSize = 50,
    pageToken?: string,
  ): Promise<{
    data: { activities: JulesActivity[]; nextPageToken?: string; } | null;
    error: string | null;
  }> {
    const name = sessionName.startsWith("sessions/")
      ? sessionName
      : `sessions/${sessionName}`;
    const params = new URLSearchParams();
    if (pageSize) params.set("pageSize", String(pageSize));
    if (pageToken) params.set("pageToken", pageToken);

    const query = params.toString();
    return this.request(`/${name}/activities${query ? `?${query}` : ""}`);
  }
}
