import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from '@playwright/test';

export interface ClientContext {
  context: BrowserContext;
  page: Page;
  clientId: string;
  name?: string;
}

export class VideoWallWorld extends World {
  browser!: Browser;
  displayContext!: BrowserContext;
  displayPage!: Page;
  clientContexts: Map<string, ClientContext> = new Map();
  baseUrl: string;
  displayId?: string;

  constructor(options: IWorldOptions) {
    super(options);
    // Use deployed URL in CI, localhost for local development
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  async init() {
    this.browser = await chromium.launch({
      headless: process.env.CI === 'true',
    });
    this.displayContext = await this.browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    this.displayPage = await this.displayContext.newPage();

    // Mock getUserMedia for all contexts
    await this.mockMediaDevices(this.displayPage);
  }

  /**
   * Create a new client context with camera/microphone permissions
   */
  async createClientContext(clientId: string, name?: string): Promise<ClientContext> {
    const context = await this.browser.newContext({
      permissions: ['camera', 'microphone', 'display-capture'],
    });
    const page = await context.newPage();

    // Mock getUserMedia for client
    await this.mockMediaDevices(page);

    const clientContext: ClientContext = {
      context,
      page,
      clientId,
      name,
    };

    this.clientContexts.set(clientId, clientContext);
    return clientContext;
  }

  /**
   * Mock getUserMedia and other media APIs for testing
   * This creates fake video/audio streams instead of requiring real hardware
   */
  async mockMediaDevices(page: Page) {
    await page.addInitScript(() => {
      // Create a fake MediaStream with video track
      const createFakeMediaStream = (constraints?: MediaStreamConstraints) => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d')!;

        // Draw a test pattern
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(100, 100, 440, 280);
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.fillText('Test Video', 200, 250);

        // @ts-ignore - Canvas captureStream
        const stream = canvas.captureStream(30) as MediaStream;

        // Add audio track if requested
        if (constraints?.audio) {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const dest = audioContext.createMediaStreamDestination();
          oscillator.connect(dest);
          oscillator.start();
          stream.addTrack(dest.stream.getAudioTracks()[0]);
        }

        return stream;
      };

      // Mock navigator.mediaDevices.getUserMedia
      if (navigator.mediaDevices) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          console.log('[Mock] getUserMedia called with constraints:', constraints);
          // Return fake stream instead of real camera
          return createFakeMediaStream(constraints);
        };

        // Mock enumerateDevices
        navigator.mediaDevices.enumerateDevices = async () => {
          return [
            {
              deviceId: 'fake-camera-1',
              groupId: 'fake-group-1',
              kind: 'videoinput' as MediaDeviceKind,
              label: 'Fake Camera 1 (Front)',
              toJSON: () => ({}),
            },
            {
              deviceId: 'fake-camera-2',
              groupId: 'fake-group-1',
              kind: 'videoinput' as MediaDeviceKind,
              label: 'Fake Camera 2 (Back)',
              toJSON: () => ({}),
            },
            {
              deviceId: 'fake-mic-1',
              groupId: 'fake-group-1',
              kind: 'audioinput' as MediaDeviceKind,
              label: 'Fake Microphone',
              toJSON: () => ({}),
            },
          ];
        };

        // Mock getDisplayMedia for screen sharing
        navigator.mediaDevices.getDisplayMedia = async (constraints) => {
          console.log('[Mock] getDisplayMedia called with constraints:', constraints);
          const stream = createFakeMediaStream({ video: true });
          // Label the stream as screen share
          Object.defineProperty(stream, '__isScreenShare', { value: true });
          return stream;
        };
      }
    });
  }

  /**
   * Mock PeerJS connection for testing WebRTC without real network
   */
  async mockPeerJS(page: Page) {
    await page.addInitScript(() => {
      // Store original Peer if it exists
      const OriginalPeer = (window as any).Peer;

      // Mock Peer class
      class MockPeer {
        id: string;
        private callbacks: Map<string, Function[]> = new Map();
        private connections: Map<string, any> = new Map();

        constructor(id?: string, options?: any) {
          this.id = id || `mock-peer-${Math.random().toString(36).substr(2, 9)}`;
          console.log('[MockPeer] Created with id:', this.id);

          // Simulate connection open
          setTimeout(() => {
            this.emit('open', this.id);
          }, 100);
        }

        on(event: string, callback: Function) {
          if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
          }
          this.callbacks.get(event)!.push(callback);
          return this;
        }

        emit(event: string, ...args: any[]) {
          const callbacks = this.callbacks.get(event);
          if (callbacks) {
            callbacks.forEach(cb => cb(...args));
          }
        }

        connect(peerId: string, options?: any) {
          console.log('[MockPeer] Connecting to:', peerId);
          const connection = new MockDataConnection(peerId, this);
          this.connections.set(peerId, connection);

          // Simulate connection open
          setTimeout(() => {
            connection.emit('open');
          }, 200);

          return connection;
        }

        call(peerId: string, stream: MediaStream, options?: any) {
          console.log('[MockPeer] Calling:', peerId);
          const call = new MockMediaConnection(peerId, stream, this);

          // Simulate call answered with a mock stream
          setTimeout(() => {
            // Create a fake answer stream
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            // @ts-ignore
            const answerStream = canvas.captureStream(30) as MediaStream;
            call.emit('stream', answerStream);
          }, 300);

          return call;
        }

        disconnect() {
          console.log('[MockPeer] Disconnecting');
          this.emit('disconnected');
        }

        destroy() {
          console.log('[MockPeer] Destroying');
          this.emit('close');
        }
      }

      class MockDataConnection {
        peer: string;
        private callbacks: Map<string, Function[]> = new Map();
        open: boolean = false;

        constructor(peer: string, private peerInstance: MockPeer) {
          this.peer = peer;
        }

        on(event: string, callback: Function) {
          if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
          }
          this.callbacks.get(event)!.push(callback);
          return this;
        }

        emit(event: string, ...args: any[]) {
          if (event === 'open') {
            this.open = true;
          }
          const callbacks = this.callbacks.get(event);
          if (callbacks) {
            callbacks.forEach(cb => cb(...args));
          }
        }

        send(data: any) {
          console.log('[MockDataConnection] Sending data:', data);
        }

        close() {
          this.emit('close');
        }
      }

      class MockMediaConnection {
        peer: string;
        private callbacks: Map<string, Function[]> = new Map();

        constructor(peer: string, private stream: MediaStream, private peerInstance: MockPeer) {
          this.peer = peer;
        }

        on(event: string, callback: Function) {
          if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
          }
          this.callbacks.get(event)!.push(callback);
          return this;
        }

        emit(event: string, ...args: any[]) {
          const callbacks = this.callbacks.get(event);
          if (callbacks) {
            callbacks.forEach(cb => cb(...args));
          }
        }

        answer(stream: MediaStream) {
          console.log('[MockMediaConnection] Answering with stream');
          // Simulate receiving remote stream
          setTimeout(() => {
            this.emit('stream', this.stream);
          }, 200);
        }

        close() {
          this.emit('close');
        }
      }

      // Replace global Peer
      (window as any).Peer = MockPeer;
    });
  }

  /**
   * Get a client context by ID
   */
  getClientContext(clientId: string): ClientContext | undefined {
    return this.clientContexts.get(clientId);
  }

  /**
   * Get all client contexts
   */
  getAllClientContexts(): ClientContext[] {
    return Array.from(this.clientContexts.values());
  }

  /**
   * Close a specific client context
   */
  async closeClientContext(clientId: string) {
    const clientContext = this.clientContexts.get(clientId);
    if (clientContext) {
      await clientContext.page.close();
      await clientContext.context.close();
      this.clientContexts.delete(clientId);
    }
  }

  /**
   * Close all client contexts
   */
  async closeAllClientContexts() {
    const clientIds = Array.from(this.clientContexts.keys());
    for (const clientId of clientIds) {
      await this.closeClientContext(clientId);
    }
    this.clientContexts.clear();
  }

  async destroy() {
    await this.closeAllClientContexts();
    await this.displayPage?.close();
    await this.displayContext?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(VideoWallWorld);
