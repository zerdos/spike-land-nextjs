import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPeerConfig,
  getAppBaseUrl,
  getIceServers,
  getPeerServerConfig,
  getTwilioIceServers,
} from "./config";

describe("getIceServers", () => {
  it("should return an array of ICE servers", () => {
    const servers = getIceServers();
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);
  });

  it("should include STUN servers", () => {
    const servers = getIceServers();
    const stunServers = servers.filter(s => s.urls.toString().startsWith("stun:"));
    expect(stunServers.length).toBeGreaterThan(0);
  });

  it("should include Google STUN servers", () => {
    const servers = getIceServers();
    const googleStun = servers.find(s => s.urls === "stun:stun.l.google.com:19302");
    expect(googleStun).toBeDefined();
  });

  it("should only include STUN servers (no TURN)", () => {
    const servers = getIceServers();
    const turnServers = servers.filter(s => s.urls.toString().startsWith("turn:"));
    expect(turnServers.length).toBe(0);
  });
});

describe("getTwilioIceServers", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch and return Twilio ICE servers on success", async () => {
    const mockServers = [
      { urls: "stun:global.stun.twilio.com:3478" },
      {
        urls: "turn:global.turn.twilio.com:3478?transport=udp",
        username: "test_user",
        credential: "test_pass",
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iceServers: mockServers }),
    });

    const servers = await getTwilioIceServers();
    expect(servers).toEqual(mockServers);
    expect(global.fetch).toHaveBeenCalledWith("/api/turn-credentials");
  });

  it("should return fallback servers when API request fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const servers = await getTwilioIceServers();
    expect(servers).toEqual(getIceServers());
  });

  it("should return fallback servers when fetch throws error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const servers = await getTwilioIceServers();
    expect(servers).toEqual(getIceServers());
  });

  it("should return fallback servers when response has no iceServers", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const servers = await getTwilioIceServers();
    expect(servers).toEqual(getIceServers());
  });
});

describe("getPeerServerConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return undefined when no environment variables are set", () => {
    delete process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;

    const config = getPeerServerConfig();
    expect(config).toBeUndefined();
  });

  it("should return config when only host is provided", () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_HOST = "peer.example.com";
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: "peer.example.com",
      port: 443,
      path: "/",
      secure: false,
    });
  });

  it("should return config when only port is provided", () => {
    delete process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
    process.env.NEXT_PUBLIC_PEER_SERVER_PORT = "9000";
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: "0.peerjs.com",
      port: 9000,
      path: "/",
      secure: false,
    });
  });

  it("should return config when only path is provided", () => {
    delete process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
    process.env.NEXT_PUBLIC_PEER_SERVER_PATH = "/myserver";
    delete process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: "0.peerjs.com",
      port: 443,
      path: "/myserver",
      secure: false,
    });
  });

  it("should return config when only secure is provided", () => {
    delete process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = "true";

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      secure: true,
    });
  });

  it("should return config with all custom values", () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_HOST = "custom.peer.com";
    process.env.NEXT_PUBLIC_PEER_SERVER_PORT = "8080";
    process.env.NEXT_PUBLIC_PEER_SERVER_PATH = "/peer";
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = "true";

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: "custom.peer.com",
      port: 8080,
      path: "/peer",
      secure: true,
    });
  });

  it("should parse port as integer", () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_PORT = "9000";

    const config = getPeerServerConfig();
    expect(config?.port).toBe(9000);
    expect(typeof config?.port).toBe("number");
  });

  it("should handle secure flag as string comparison", () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = "false";

    const config = getPeerServerConfig();
    expect(config?.secure).toBe(false);
  });

  it('should treat non-"true" secure values as false', () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = "yes";

    const config = getPeerServerConfig();
    expect(config?.secure).toBe(false);
  });
});

describe("createPeerConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should create config for host role without peerId", () => {
    const config = createPeerConfig("host");
    expect(config.role).toBe("host");
    expect(config.peerId).toBeUndefined();
    expect(config.serverConfig).toBeUndefined();
  });

  it("should create config for client role without peerId", () => {
    const config = createPeerConfig("client");
    expect(config.role).toBe("client");
    expect(config.peerId).toBeUndefined();
    expect(config.serverConfig).toBeUndefined();
  });

  it("should create config with custom peerId", () => {
    const config = createPeerConfig("host", "custom-peer-id");
    expect(config.role).toBe("host");
    expect(config.peerId).toBe("custom-peer-id");
    expect(config.serverConfig).toBeUndefined();
  });

  it("should include server config when environment variables are set", () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_HOST = "peer.example.com";
    process.env.NEXT_PUBLIC_PEER_SERVER_PORT = "9000";
    process.env.NEXT_PUBLIC_PEER_SERVER_PATH = "/peer";
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = "true";

    const config = createPeerConfig("host", "test-id");
    expect(config.role).toBe("host");
    expect(config.peerId).toBe("test-id");
    expect(config.serverConfig).toEqual({
      host: "peer.example.com",
      port: 9000,
      path: "/peer",
      secure: true,
    });
  });
});

describe("getAppBaseUrl", () => {
  const originalWindow = global.window;

  afterEach(() => {
    if (originalWindow) {
      global.window = originalWindow;
    } else {
      // @ts-expect-error - Deleting window for SSR test
      delete global.window;
    }
  });

  it("should return window.location.origin in browser environment", () => {
    global.window = {
      location: {
        origin: "https://example.com",
      },
    } as unknown as Window & typeof globalThis;

    const url = getAppBaseUrl();
    expect(url).toBe("https://example.com");
  });

  it("should return NEXT_PUBLIC_APP_URL in SSR environment when set", () => {
    // @ts-expect-error - Deleting window for SSR test
    delete global.window;
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://my-app.com";

    const url = getAppBaseUrl();
    expect(url).toBe("https://my-app.com");

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it("should return localhost fallback in SSR environment without env var", () => {
    // @ts-expect-error - Deleting window for SSR test
    delete global.window;
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const url = getAppBaseUrl();
    expect(url).toBe("http://localhost:3000");

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
  });
});
