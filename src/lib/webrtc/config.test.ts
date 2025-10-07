import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getIceServers, getPeerServerConfig, createPeerConfig, getAppBaseUrl } from './config';

describe('getIceServers', () => {
  it('should return an array of ICE servers', () => {
    const servers = getIceServers();
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);
  });

  it('should include STUN servers', () => {
    const servers = getIceServers();
    const stunServers = servers.filter(s => s.urls.toString().startsWith('stun:'));
    expect(stunServers.length).toBeGreaterThan(0);
  });

  it('should include TURN servers', () => {
    const servers = getIceServers();
    const turnServers = servers.filter(s => s.urls.toString().startsWith('turn:'));
    expect(turnServers.length).toBeGreaterThan(0);
  });

  it('should include Google STUN servers', () => {
    const servers = getIceServers();
    const googleStun = servers.find(s => s.urls === 'stun:stun.l.google.com:19302');
    expect(googleStun).toBeDefined();
  });

  it('should include TURN servers with credentials', () => {
    const servers = getIceServers();
    const turnServers = servers.filter(s => s.urls.toString().startsWith('turn:'));

    turnServers.forEach(server => {
      expect(server).toHaveProperty('username');
      expect(server).toHaveProperty('credential');
      expect(typeof server.username).toBe('string');
      expect(typeof server.credential).toBe('string');
    });
  });

  it('should include metered.ca TURN servers', () => {
    const servers = getIceServers();
    const meteredTurn = servers.find(s =>
      s.urls.toString().includes('openrelay.metered.ca')
    );
    expect(meteredTurn).toBeDefined();
  });

  it('should include TURN servers on multiple ports', () => {
    const servers = getIceServers();
    const turnServers = servers.filter(s => s.urls.toString().startsWith('turn:'));

    const ports = turnServers.map(s => {
      const match = s.urls.toString().match(/:(\d+)/);
      return match ? match[1] : null;
    });

    expect(ports).toContain('80');
    expect(ports).toContain('443');
  });

  it('should include TCP transport option for TURN', () => {
    const servers = getIceServers();
    const tcpTurn = servers.find(s =>
      s.urls.toString().includes('transport=tcp')
    );
    expect(tcpTurn).toBeDefined();
  });
});

describe('getPeerServerConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return undefined when no environment variables are set', () => {
    delete process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;

    const config = getPeerServerConfig();
    expect(config).toBeUndefined();
  });

  it('should return config when only host is provided', () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_HOST = 'peer.example.com';
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: 'peer.example.com',
      port: 443,
      path: '/',
      secure: false,
    });
  });

  it('should return config when only port is provided', () => {
    delete process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
    process.env.NEXT_PUBLIC_PEER_SERVER_PORT = '9000';
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: '0.peerjs.com',
      port: 9000,
      path: '/',
      secure: false,
    });
  });

  it('should return config when only path is provided', () => {
    delete process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
    process.env.NEXT_PUBLIC_PEER_SERVER_PATH = '/myserver';
    delete process.env.NEXT_PUBLIC_PEER_SERVER_SECURE;

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: '0.peerjs.com',
      port: 443,
      path: '/myserver',
      secure: false,
    });
  });

  it('should return config when only secure is provided', () => {
    delete process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PORT;
    delete process.env.NEXT_PUBLIC_PEER_SERVER_PATH;
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = 'true';

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
    });
  });

  it('should return config with all custom values', () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_HOST = 'custom.peer.com';
    process.env.NEXT_PUBLIC_PEER_SERVER_PORT = '8080';
    process.env.NEXT_PUBLIC_PEER_SERVER_PATH = '/peer';
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = 'true';

    const config = getPeerServerConfig();
    expect(config).toEqual({
      host: 'custom.peer.com',
      port: 8080,
      path: '/peer',
      secure: true,
    });
  });

  it('should parse port as integer', () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_PORT = '9000';

    const config = getPeerServerConfig();
    expect(config?.port).toBe(9000);
    expect(typeof config?.port).toBe('number');
  });

  it('should handle secure flag as string comparison', () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = 'false';

    const config = getPeerServerConfig();
    expect(config?.secure).toBe(false);
  });

  it('should treat non-"true" secure values as false', () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = 'yes';

    const config = getPeerServerConfig();
    expect(config?.secure).toBe(false);
  });
});

describe('createPeerConfig', () => {
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

  it('should create config for host role without peerId', () => {
    const config = createPeerConfig('host');
    expect(config.role).toBe('host');
    expect(config.peerId).toBeUndefined();
    expect(config.serverConfig).toBeUndefined();
  });

  it('should create config for client role without peerId', () => {
    const config = createPeerConfig('client');
    expect(config.role).toBe('client');
    expect(config.peerId).toBeUndefined();
    expect(config.serverConfig).toBeUndefined();
  });

  it('should create config with custom peerId', () => {
    const config = createPeerConfig('host', 'custom-peer-id');
    expect(config.role).toBe('host');
    expect(config.peerId).toBe('custom-peer-id');
    expect(config.serverConfig).toBeUndefined();
  });

  it('should include server config when environment variables are set', () => {
    process.env.NEXT_PUBLIC_PEER_SERVER_HOST = 'peer.example.com';
    process.env.NEXT_PUBLIC_PEER_SERVER_PORT = '9000';
    process.env.NEXT_PUBLIC_PEER_SERVER_PATH = '/peer';
    process.env.NEXT_PUBLIC_PEER_SERVER_SECURE = 'true';

    const config = createPeerConfig('host', 'test-id');
    expect(config.role).toBe('host');
    expect(config.peerId).toBe('test-id');
    expect(config.serverConfig).toEqual({
      host: 'peer.example.com',
      port: 9000,
      path: '/peer',
      secure: true,
    });
  });
});

describe('getAppBaseUrl', () => {
  const originalWindow = global.window;

  afterEach(() => {
    if (originalWindow) {
      global.window = originalWindow;
    } else {
      // @ts-expect-error - Deleting window for SSR test
      delete global.window;
    }
  });

  it('should return window.location.origin in browser environment', () => {
    global.window = {
      location: {
        origin: 'https://example.com',
      },
    } as unknown as Window & typeof globalThis;

    const url = getAppBaseUrl();
    expect(url).toBe('https://example.com');
  });

  it('should return NEXT_PUBLIC_APP_URL in SSR environment when set', () => {
    // @ts-expect-error - Deleting window for SSR test
    delete global.window;
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://my-app.com';

    const url = getAppBaseUrl();
    expect(url).toBe('https://my-app.com');

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it('should return localhost fallback in SSR environment without env var', () => {
    // @ts-expect-error - Deleting window for SSR test
    delete global.window;
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const url = getAppBaseUrl();
    expect(url).toBe('http://localhost:3000');

    // Restore
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
  });
});
