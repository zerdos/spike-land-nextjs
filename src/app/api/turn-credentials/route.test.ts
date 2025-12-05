import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("TURN Credentials API", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should return TURN credentials when Twilio API succeeds", async () => {
    process.env.TWILIO_ACCOUNT_SID = "test_sid";
    process.env.TWILIO_AUTH_TOKEN = "test_token";

    const mockResponse = {
      ice_servers: [
        {
          urls: "stun:global.stun.twilio.com:3478",
        },
        {
          urls: "turn:global.turn.twilio.com:3478?transport=udp",
          username: "test_username",
          credential: "test_credential",
        },
      ],
      ttl: 86400,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      iceServers: mockResponse.ice_servers,
      ttl: mockResponse.ttl,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.twilio.com/2010-04-01/Accounts/test_sid/Tokens.json",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": expect.stringContaining("Basic"),
        }),
      }),
    );
  });

  it("should return 500 when Twilio credentials are missing", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Twilio credentials not configured" });
  });

  it("should return 500 when Twilio API fails", async () => {
    process.env.TWILIO_ACCOUNT_SID = "test_sid";
    process.env.TWILIO_AUTH_TOKEN = "test_token";

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch TURN credentials" });
  });

  it("should return 500 when fetch throws an error", async () => {
    process.env.TWILIO_ACCOUNT_SID = "test_sid";
    process.env.TWILIO_AUTH_TOKEN = "test_token";

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch TURN credentials" });
  });

  it("should encode credentials correctly in Authorization header", async () => {
    process.env.TWILIO_ACCOUNT_SID = "test_sid";
    process.env.TWILIO_AUTH_TOKEN = "test_token";

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ice_servers: [], ttl: 86400 }),
    });

    await GET();

    const expectedAuth = `Basic ${Buffer.from("test_sid:test_token").toString("base64")}`;

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Authorization": expectedAuth,
        }),
      }),
    );
  });
});
