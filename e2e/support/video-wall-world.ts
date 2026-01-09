import type { IWorldOptions } from "@cucumber/cucumber";
import { setWorldConstructor } from "@cucumber/cucumber";
import type { BrowserContext, Page } from "@playwright/test";
import { chromium } from "@playwright/test";
import { startCoverage, stopCoverage } from "./helpers/coverage-helper";
import { CustomWorld } from "./world";

export interface ClientContext {
  context: BrowserContext;
  page: Page;
  clientId: string;
  name?: string;
}

export class VideoWallWorld extends CustomWorld {
  displayContext!: BrowserContext;
  displayPage!: Page;
  override get page() {
    return this.displayPage;
  }
  override set page(p: Page) {
    this.displayPage = p;
  }
  override get context() {
    return this.displayContext;
  }
  override set context(c: BrowserContext) {
    this.displayContext = c;
  }
  clientContexts: Map<string, ClientContext> = new Map();
  displayId?: string;

  constructor(options: IWorldOptions) {
    super(options);
  }

  override async init() {
    // Docker/CI environment needs additional Chromium flags for stability
    const isCI = process.env.CI === "true";
    this.browser = await chromium.launch({
      headless: isCI,
      args: isCI
        ? [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", // Prevents crashes in Docker with limited /dev/shm
          "--disable-gpu",
          "--disable-software-rasterizer",
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-default-apps",
          "--no-first-run",
          "--disable-features=TranslateUI",
          // Additional memory optimization flags
          "--single-process", // Run in single process mode to reduce memory
          "--disable-accelerated-2d-canvas",
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
          "--js-flags=--max-old-space-size=512",
        ]
        : [],
    });

    this.displayContext = await this.browser.newContext({
      baseURL: this.baseUrl,
      permissions: ["camera", "microphone"],
      extraHTTPHeaders: this.getExtraHTTPHeaders(),
    });
    this.displayPage = await this.displayContext.newPage();

    // Start coverage collection if enabled
    await startCoverage(this.displayPage);

    // Mock getUserMedia for all contexts
    await this.mockMediaDevices(this.displayPage);
  }

  /**
   * Create a new client context with camera/microphone permissions
   */
  async createClientContext(
    clientId: string,
    name?: string,
  ): Promise<ClientContext> {
    const context = await this.browser.newContext({
      baseURL: this.baseUrl,
      permissions: ["camera", "microphone"],
      extraHTTPHeaders: this.getExtraHTTPHeaders(),
      // Note: 'display-capture' is not a valid Playwright permission
      // Screen sharing will be mocked via mockMediaDevices instead
    });
    const page = await context.newPage();

    // Start coverage collection if enabled
    await startCoverage(page);

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
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d")!;

        // Draw a test pattern
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = "#00ff00";
        ctx.fillRect(100, 100, 440, 280);
        ctx.fillStyle = "#ffffff";
        ctx.font = "48px Arial";
        ctx.fillText("Test Video", 200, 250);

        const stream = (canvas as HTMLCanvasElement & {
          captureStream: (frameRate?: number) => MediaStream;
        })
          .captureStream(30);

        // Add audio track if requested
        if (constraints?.audio) {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const dest = audioContext.createMediaStreamDestination();
          oscillator.connect(dest);
          oscillator.start();
          const audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) {
            stream.addTrack(audioTrack);
          }
        }

        return stream;
      };

      // Mock navigator.mediaDevices.getUserMedia
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          console.log(
            "[Mock] getUserMedia called with constraints:",
            constraints,
          );
          // Return fake stream instead of real camera
          return createFakeMediaStream(constraints);
        };

        // Mock enumerateDevices
        navigator.mediaDevices.enumerateDevices = async () => {
          return [
            {
              deviceId: "fake-camera-1",
              groupId: "fake-group-1",
              kind: "videoinput" as MediaDeviceKind,
              label: "Fake Camera 1 (Front)",
              toJSON: () => ({}),
            },
            {
              deviceId: "fake-camera-2",
              groupId: "fake-group-1",
              kind: "videoinput" as MediaDeviceKind,
              label: "Fake Camera 2 (Back)",
              toJSON: () => ({}),
            },
            {
              deviceId: "fake-mic-1",
              groupId: "fake-group-1",
              kind: "audioinput" as MediaDeviceKind,
              label: "Fake Microphone",
              toJSON: () => ({}),
            },
          ];
        };

        // Mock getDisplayMedia for screen sharing
        navigator.mediaDevices.getDisplayMedia = async (constraints) => {
          console.log(
            "[Mock] getDisplayMedia called with constraints:",
            constraints,
          );
          const stream = createFakeMediaStream({ video: true });
          // Label the stream as screen share
          Object.defineProperty(stream, "__isScreenShare", { value: true });
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
      // Mock Peer class
      class MockPeer {
        id: string;
        private callbacks: Map<string, (() => void)[]> = new Map();
        private connections: Map<string, unknown> = new Map();

        constructor(id?: string) {
          this.id = id ||
            `mock-peer-${Math.random().toString(36).substr(2, 9)}`;
          console.log("[MockPeer] Created with id:", this.id);

          // Simulate connection open
          setTimeout(() => {
            this.emit("open", this.id);
          }, 100);
        }

        on(event: string, callback: (...args: unknown[]) => void) {
          if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
          }
          this.callbacks.get(event)!.push(callback);
          return this;
        }

        emit(event: string, ...args: unknown[]) {
          const callbacks = this.callbacks.get(event);
          if (callbacks) {
            callbacks.forEach((cb) => (cb as (...args: unknown[]) => void)(...args));
          }
        }

        connect(peerId: string) {
          console.log("[MockPeer] Connecting to:", peerId);
          const connection = new MockDataConnection(peerId);
          this.connections.set(peerId, connection);

          // Simulate connection open
          setTimeout(() => {
            connection.emit("open");
          }, 200);

          return connection;
        }

        call(peerId: string, stream: MediaStream) {
          console.log("[MockPeer] Calling:", peerId);
          const call = new MockMediaConnection(peerId, stream);

          // Simulate call answered with a mock stream
          setTimeout(() => {
            // Create a fake answer stream
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            const answerStream = (canvas as HTMLCanvasElement & {
              captureStream: (frameRate?: number) => MediaStream;
            }).captureStream(30);
            call.emit("stream", answerStream);
          }, 300);

          return call;
        }

        disconnect() {
          console.log("[MockPeer] Disconnecting");
          this.emit("disconnected");
        }

        destroy() {
          console.log("[MockPeer] Destroying");
          this.emit("close");
        }
      }

      class MockDataConnection {
        peer: string;
        private callbacks: Map<string, (() => void)[]> = new Map();
        open: boolean = false;

        constructor(peer: string) {
          this.peer = peer;
        }

        on(event: string, callback: (...args: unknown[]) => void) {
          if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
          }
          this.callbacks.get(event)!.push(callback);
          return this;
        }

        emit(event: string, ...args: unknown[]) {
          if (event === "open") {
            this.open = true;
          }
          const callbacks = this.callbacks.get(event);
          if (callbacks) {
            callbacks.forEach((cb) => (cb as (...args: unknown[]) => void)(...args));
          }
        }

        send(data: unknown) {
          console.log("[MockDataConnection] Sending data:", data);
        }

        close() {
          this.emit("close");
        }
      }

      class MockMediaConnection {
        peer: string;
        private callbacks: Map<string, (() => void)[]> = new Map();
        private stream: MediaStream;

        constructor(peer: string, stream: MediaStream) {
          this.peer = peer;
          this.stream = stream;
        }

        on(event: string, callback: (...args: unknown[]) => void) {
          if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
          }
          this.callbacks.get(event)!.push(callback);
          return this;
        }

        emit(event: string, ...args: unknown[]) {
          const callbacks = this.callbacks.get(event);
          if (callbacks) {
            callbacks.forEach((cb) => (cb as (...args: unknown[]) => void)(...args));
          }
        }

        answer() {
          console.log("[MockMediaConnection] Answering with stream");
          // Simulate receiving remote stream
          setTimeout(() => {
            this.emit("stream", this.stream);
          }, 200);
        }

        close() {
          this.emit("close");
        }
      }

      // Replace global Peer
      (window as unknown as { Peer?: unknown; }).Peer = MockPeer;
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

  override async destroy() {
    // Stop coverage collection on all pages before closing
    if (this.displayPage) {
      await stopCoverage(this.displayPage);
    }
    for (const client of this.clientContexts.values()) {
      if (client.page) {
        await stopCoverage(client.page);
      }
    }

    await this.closeAllClientContexts();
    await this.displayPage?.close();
    await this.displayContext?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(VideoWallWorld);
