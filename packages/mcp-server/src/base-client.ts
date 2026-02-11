/**
 * Base API Client
 *
 * Reusable HTTP client base class for spike.land API endpoints.
 * Provides authentication, error handling, and JSON request/response.
 */

const DEFAULT_BASE_URL = "https://spike.land";

export class BaseApiClient {
  protected baseUrl: string;
  protected apiKey: string;

  constructor(apiKey: string, baseUrl?: string) {
    if (!apiKey) {
      throw new Error("API key is required");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || process.env.SPIKE_LAND_BASE_URL || DEFAULT_BASE_URL;
  }

  protected async request<T>(
    endpoint: string,
    method: string = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed with status ${response.status}`,
      );
    }

    return data as T;
  }
}
