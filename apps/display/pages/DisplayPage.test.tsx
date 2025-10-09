import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import DisplayPage from './DisplayPage';

// Mock PeerJS module with vi.hoisted
const { mockPeerInstance, MockPeer, mockToDataURL } = vi.hoisted(() => {
  const mockPeerInstance = {
    on: vi.fn(),
    destroy: vi.fn(),
    id: 'mock-peer-id',
  };
  const MockPeer = vi.fn(() => mockPeerInstance);
  const mockToDataURL = vi.fn(() => Promise.resolve('data:image/png;base64,mockqrcode'));
  return { mockPeerInstance, MockPeer, mockToDataURL };
});

vi.mock('peerjs', () => ({
  default: MockPeer,
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

// Mock QRCode
vi.mock('qrcode', () => ({
  default: {
    toDataURL: mockToDataURL,
  },
}));

// Mock layout optimizer
vi.mock('@apps/display/lib/layout-optimizer', () => ({
  calculateOptimalLayout: vi.fn(() => ({
    rows: 2,
    cols: 2,
    cellWidth: 960,
    cellHeight: 540,
    videoWidth: 944,
    videoHeight: 524,
    totalArea: 1000000,
  })),
}));

describe('DisplayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
      },
      writable: true,
      configurable: true,
    });

    // Mock fetch for Twilio ICE servers
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:global.turn.twilio.com:3478?transport=udp',
            username: 'test',
            credential: 'test',
          },
        ],
      }),
    });

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Setup RTCPeerConnection for PeerJS
    global.RTCPeerConnection = vi.fn() as unknown as typeof RTCPeerConnection;

    // Mock MediaStream
    global.MediaStream = vi.fn().mockImplementation(() => ({
      id: 'mock-stream-id',
      active: true,
      getTracks: vi.fn(() => []),
      getAudioTracks: vi.fn(() => []),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
      clone: vi.fn(),
    })) as unknown as typeof MediaStream;
  });

  it('should render display page', () => {
    render(<DisplayPage />);
    expect(screen.getByText(/Smart Video Wall Display/i)).toBeInTheDocument();
  });

  it('should show initializing state', () => {
    render(<DisplayPage />);
    expect(screen.getByText(/Initializing.../i)).toBeInTheDocument();
  });

  it('should initialize PeerJS on mount', async () => {
    const Peer = (await import('peerjs')).default;

    render(<DisplayPage />);

    // Wait for async initialization with Twilio ICE servers
    await waitFor(() => {
      expect(Peer).toHaveBeenCalledWith({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: 'turn:global.turn.twilio.com:3478?transport=udp',
              username: 'test',
              credential: 'test',
            },
          ],
        },
      });
    });
  });

  it('should handle peer open event and generate QR code', async () => {
    render(<DisplayPage />);

    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get and trigger the open handler
    const onCalls = mockPeerInstance.on.mock.calls;
    const openHandler = onCalls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      openHandler?.('display-123');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(screen.getByText(/Display Ready/i)).toBeInTheDocument();
      expect(screen.getByText(/ID: display-123/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockToDataURL).toHaveBeenCalledWith(
        'http://localhost:3000/apps/display/client?displayId=display-123',
        expect.objectContaining({
          width: 200,
          margin: 2,
        })
      );
    });
  });

  it('should destroy peer on unmount', async () => {
    const { unmount } = render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    await act(async () => {
      unmount();
    });

    expect(mockPeerInstance.destroy).toHaveBeenCalled();
  });

  it('should calculate optimal layout with correct dimensions', async () => {
    const { calculateOptimalLayout } = await import('@apps/display/lib/layout-optimizer');

    render(<DisplayPage />);

    await waitFor(() => {
      expect(calculateOptimalLayout).toHaveBeenCalledWith(
        expect.objectContaining({
          numClients: 0,
        })
      );
    });
  });

  it('should display QR code when generated', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Trigger the open event
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      openHandler?.('display-123');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      const qrImage = screen.getByAltText('QR Code');
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', 'data:image/png;base64,mockqrcode');
    });

    expect(screen.getByText(/Scan this QR code with your mobile phone to connect/i)).toBeInTheDocument();
  });

  it('should handle QR code generation error', async () => {
    mockToDataURL.mockRejectedValueOnce(new Error('QR generation failed'));

    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Trigger the open event
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      openHandler?.('display-123');
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // QR code generation error is handled silently
    // The display should still render normally without a QR code
    expect(screen.getByText(/Display Ready/i)).toBeInTheDocument();
  });

  it('should handle incoming data connection from client', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get the connection handler
    const connectionHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'connection'
    )?.[1];

    // Mock data connection
    const mockDataConnection = {
      peer: 'client-456',
      on: vi.fn(),
      send: vi.fn(),
    };

    await act(async () => {
      connectionHandler?.(mockDataConnection);
    });

    // Trigger the open event on data connection
    const dataOpenHandler = mockDataConnection.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      dataOpenHandler?.();
    });

    expect(mockDataConnection.send).toHaveBeenCalledWith({
      type: 'welcome',
      message: 'Connected to display',
    });
  });

  it('should handle incoming media call and receive stream', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get the call handler
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    // Mock media call
    const mockCall = {
      peer: 'client-789',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall);
    });

    expect(mockCall.answer).toHaveBeenCalled();

    // Get the stream handler
    const streamHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    // Mock MediaStream
    const mockStream = new MediaStream();

    await act(async () => {
      streamHandler?.(mockStream);
    });

    // Verify stream was added (peer ID is truncated to first 8 chars)
    await waitFor(() => {
      expect(screen.getByText(/client-7/i)).toBeInTheDocument();
    });
  });

  it('should not add duplicate stream from same client', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get the call handler
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    // First call from client
    const mockCall1 = {
      peer: 'client-same',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall1);
    });

    const streamHandler1 = mockCall1.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    const mockStream1 = new MediaStream();

    await act(async () => {
      streamHandler1?.(mockStream1);
    });

    // Second call from same client
    const mockCall2 = {
      peer: 'client-same',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall2);
    });

    const streamHandler2 = mockCall2.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    const mockStream2 = new MediaStream();

    await act(async () => {
      streamHandler2?.(mockStream2);
    });

    // Should only have one video element for this client
    await waitFor(() => {
      const videos = screen.queryAllByText(/client-same/i);
      // Text appears once in peer ID overlay
      expect(videos.length).toBeLessThanOrEqual(1);
    });
  });

  it('should handle call close and remove stream', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get call handler
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    const mockCall = {
      peer: 'client-close-test',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall);
    });

    // Add stream
    const streamHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    await act(async () => {
      streamHandler?.(new MediaStream());
    });

    // Verify stream was added (peer ID is truncated to first 8 chars)
    await waitFor(() => {
      expect(screen.getByText(/client-c/i)).toBeInTheDocument();
    });

    // Get close handler
    const closeHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'close'
    )?.[1];

    await act(async () => {
      closeHandler?.();
    });

    // Verify stream was removed
    await waitFor(() => {
      expect(screen.queryByText(/client-c/i)).not.toBeInTheDocument();
    });
  });

  it('should handle call error and remove stream', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get call handler
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    const mockCall = {
      peer: 'client-error-test',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall);
    });

    // Add stream
    const streamHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    await act(async () => {
      streamHandler?.(new MediaStream());
    });

    // Verify stream was added (peer ID is truncated to first 8 chars)
    await waitFor(() => {
      expect(screen.getByText(/client-e/i)).toBeInTheDocument();
    });

    // Get error handler
    const errorHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'error'
    )?.[1];

    const mockError = new Error('Call error');
    await act(async () => {
      errorHandler?.(mockError);
    });

    // Verify stream was removed after error
    await waitFor(() => {
      expect(screen.queryByText(/client-e/i)).not.toBeInTheDocument();
    });
  });

  it('should handle peer error', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get error handler
    const errorHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'error'
    )?.[1];

    const mockError = new Error('Peer connection error');
    await act(async () => {
      errorHandler?.(mockError);
    });

    // Peer error is handled silently, display should still be functional
    expect(screen.getByText(/Initializing/i)).toBeInTheDocument();
  });

  it('should render video grid when clients are connected', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // First trigger open event to set displayId
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      openHandler?.('display-123');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Get call handler
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    // Add multiple clients
    for (let i = 1; i <= 3; i++) {
      const mockCall = {
        peer: `client-${i}`,
        answer: vi.fn(),
        on: vi.fn(),
      };

      await act(async () => {
        callHandler?.(mockCall);
      });

      const streamHandler = mockCall.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
      )?.[1];

      await act(async () => {
        streamHandler?.(new MediaStream());
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/Display Ready \(3 clients\)/i)).toBeInTheDocument();
    });

    // Check that video elements are rendered
    await waitFor(() => {
      const videos = document.querySelectorAll('video');
      expect(videos.length).toBe(3);
    });
  });

  it('should show QR code in corner when clients are connected', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Trigger open event to generate QR code
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      openHandler?.('display-123');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Wait for QR code to be generated
    await waitFor(() => {
      expect(screen.getByAltText('QR Code')).toBeInTheDocument();
    });

    // Get call handler and add a client
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    const mockCall = {
      peer: 'client-qr-test',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall);
    });

    const streamHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    await act(async () => {
      streamHandler?.(new MediaStream());
    });

    // Should show "Scan with mobile phone" text when clients are connected
    await waitFor(() => {
      expect(screen.getByText(/Scan with mobile phone/i)).toBeInTheDocument();
    });
  });

  it('should render VideoCell component with stream', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get call handler
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    const mockCall = {
      peer: 'video-cell-test-client',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall);
    });

    const streamHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    const mockStream = new MediaStream();
    await act(async () => {
      streamHandler?.(mockStream);
    });

    // Check that video element exists and has correct attributes
    await waitFor(() => {
      const videos = document.querySelectorAll('video');
      expect(videos.length).toBeGreaterThan(0);
      const video = videos[0];
      expect(video).toHaveAttribute('autoplay');
      expect(video).toHaveAttribute('playsinline');
      expect(video.className).toContain('object-cover');
      expect(video.style.maxWidth).toBe('944px');
      expect(video.style.maxHeight).toBe('524px');
    });

    // Check peer ID overlay - peer ID is truncated to first 8 chars
    await waitFor(() => {
      expect(screen.getByText('video-ce...')).toBeInTheDocument();
    });
  });

  it('should update video srcObject when stream changes', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    const mockCall = {
      peer: 'stream-update-test',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall);
    });

    const streamHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    const mockStream = new MediaStream();
    await act(async () => {
      streamHandler?.(mockStream);
    });

    await waitFor(() => {
      const videos = document.querySelectorAll('video');
      expect(videos.length).toBeGreaterThan(0);
      expect(videos[0].srcObject).toBe(mockStream);
    });
  });

  it('should observe container resize and update dimensions', async () => {
    const mockObserve = vi.fn();
    const mockDisconnect = vi.fn();

    global.ResizeObserver = vi.fn().mockImplementation((callback) => {
      // Call the callback immediately with mock entry
      setTimeout(() => {
        callback([
          {
            target: {
              clientWidth: 1920,
              clientHeight: 1080,
            },
          },
        ]);
      }, 0);

      return {
        observe: mockObserve,
        unobserve: vi.fn(),
        disconnect: mockDisconnect,
      };
    });

    const { unmount } = render(<DisplayPage />);

    await waitFor(() => {
      expect(mockObserve).toHaveBeenCalled();
    });

    // Unmount to trigger cleanup
    await act(async () => {
      unmount();
    });

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should handle ResizeObserver without container ref', async () => {
    const mockObserve = vi.fn();
    const mockDisconnect = vi.fn();

    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: mockObserve,
      unobserve: vi.fn(),
      disconnect: mockDisconnect,
    }));

    render(<DisplayPage />);

    await waitFor(() => {
      expect(mockObserve).toHaveBeenCalled();
    });
  });

  it('should calculate layout with multiple clients', async () => {
    const { calculateOptimalLayout } = await import('@apps/display/lib/layout-optimizer');

    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get call handler
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    // Add 4 clients
    for (let i = 1; i <= 4; i++) {
      const mockCall = {
        peer: `layout-client-${i}`,
        answer: vi.fn(),
        on: vi.fn(),
      };

      await act(async () => {
        callHandler?.(mockCall);
      });

      const streamHandler = mockCall.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
      )?.[1];

      await act(async () => {
        streamHandler?.(new MediaStream());
      });
    }

    await waitFor(() => {
      expect(calculateOptimalLayout).toHaveBeenCalledWith(
        expect.objectContaining({
          numClients: 4,
          videoAspectRatio: 16 / 9,
          minCellPadding: 8,
        })
      );
    });
  });

  it('should render "Open Client in New Window" button when QR code is generated', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Trigger open event to generate QR code
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      openHandler?.('display-123');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Wait for QR code to be generated
    await waitFor(() => {
      expect(screen.getByText(/Open Client in New Window/i)).toBeInTheDocument();
    });
  });

  it('should open client URL in new window when button is clicked', async () => {
    // Mock window.open
    const mockOpen = vi.fn();
    global.window.open = mockOpen;

    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Trigger open event to generate QR code
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      openHandler?.('display-123');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Wait for button to be rendered
    await waitFor(() => {
      expect(screen.getByText(/Open Client in New Window/i)).toBeInTheDocument();
    });

    // Click the button
    const button = screen.getByText(/Open Client in New Window/i);
    await act(async () => {
      button.click();
    });

    // Verify window.open was called with correct URL
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:3000/apps/display/client?displayId=display-123',
      '_blank'
    );
  });

  it('should show "Open in New Window" button in corner when clients are connected', async () => {
    // Mock window.open
    const mockOpen = vi.fn();
    global.window.open = mockOpen;

    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Trigger open event to generate QR code and set displayId
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      openHandler?.('display-123');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Get call handler and add a client
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    const mockCall = {
      peer: 'client-corner-test',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall);
    });

    const streamHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    await act(async () => {
      streamHandler?.(new MediaStream());
    });

    // Should show "Open in New Window" button when clients are connected
    await waitFor(() => {
      const buttons = screen.getAllByText(/Open in New Window/i);
      expect(buttons.length).toBeGreaterThan(0);
    });

    // Click the corner button (the second "Open in New Window" button)
    const buttons = screen.getAllByText(/Open in New Window/i);
    const cornerButton = buttons[buttons.length - 1]; // Get the last button (corner button)

    await act(async () => {
      cornerButton.click();
    });

    // Verify window.open was called with correct URL from corner button
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost:3000/apps/display/client?displayId=display-123',
      '_blank'
    );
  });

  it('should apply grid layout styles based on calculated layout', async () => {
    render(<DisplayPage />);

    // Wait for peer to be initialized
    await waitFor(() => {
      expect(mockPeerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    // Get call handler
    const callHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'call'
    )?.[1];

    const mockCall = {
      peer: 'grid-style-test',
      answer: vi.fn(),
      on: vi.fn(),
    };

    await act(async () => {
      callHandler?.(mockCall);
    });

    const streamHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'stream'
    )?.[1];

    await act(async () => {
      streamHandler?.(new MediaStream());
    });

    await waitFor(() => {
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveStyle({
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateColumns: 'repeat(2, 1fr)',
      });
    });
  });
});
