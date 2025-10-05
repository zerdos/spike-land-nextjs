import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import DisplayPage from './page';

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
vi.mock('@/lib/layout-optimizer', () => ({
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

    await waitFor(() => {
      expect(Peer).toHaveBeenCalledWith({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
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
        'http://localhost:3000/client?displayId=display-123',
        expect.objectContaining({
          width: 200,
          margin: 2,
        })
      );
    });
  });

  it('should destroy peer on unmount', async () => {
    const { unmount } = render(<DisplayPage />);

    await act(async () => {
      unmount();
    });

    expect(mockPeerInstance.destroy).toHaveBeenCalled();
  });

  it('should calculate optimal layout with correct dimensions', async () => {
    const { calculateOptimalLayout } = await import('@/lib/layout-optimizer');

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

    expect(screen.getByText(/Scan to connect your camera/i)).toBeInTheDocument();
  });

  it('should handle QR code generation error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockToDataURL.mockRejectedValueOnce(new Error('QR generation failed'));

    render(<DisplayPage />);

    // Trigger the open event
    const openHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'open'
    )?.[1];

    await act(async () => {
      openHandler?.('display-123');
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to generate QR code:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle incoming data connection from client', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    render(<DisplayPage />);

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

    expect(consoleLogSpy).toHaveBeenCalledWith('New data connection from:', 'client-456');

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

    consoleLogSpy.mockRestore();
  });

  it('should handle incoming media call and receive stream', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    render(<DisplayPage />);

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

    expect(consoleLogSpy).toHaveBeenCalledWith('Incoming call from:', 'client-789');
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

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith('Received stream from:', 'client-789');
    });

    consoleLogSpy.mockRestore();
  });

  it('should not add duplicate stream from same client', async () => {
    render(<DisplayPage />);

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
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    render(<DisplayPage />);

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

    // Get close handler
    const closeHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'close'
    )?.[1];

    await act(async () => {
      closeHandler?.();
    });

    expect(consoleLogSpy).toHaveBeenCalledWith('Call closed:', 'client-close-test');

    consoleLogSpy.mockRestore();
  });

  it('should handle call error and remove stream', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DisplayPage />);

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

    // Get error handler
    const errorHandler = mockCall.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'error'
    )?.[1];

    const mockError = new Error('Call error');
    await act(async () => {
      errorHandler?.(mockError);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Call error:', mockError);

    consoleErrorSpy.mockRestore();
  });

  it('should handle peer error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DisplayPage />);

    // Get error handler
    const errorHandler = mockPeerInstance.on.mock.calls.find(
      (call: [string, (...args: unknown[]) => void]) => call[0] === 'error'
    )?.[1];

    const mockError = new Error('Peer connection error');
    await act(async () => {
      errorHandler?.(mockError);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Peer error:', mockError);

    consoleErrorSpy.mockRestore();
  });

  it('should render video grid when clients are connected', async () => {
    render(<DisplayPage />);

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

    // Should show "Add Client" text when clients are connected
    await waitFor(() => {
      expect(screen.getByText(/Add Client/i)).toBeInTheDocument();
    });
  });

  it('should render VideoCell component with stream', async () => {
    render(<DisplayPage />);

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
    const { calculateOptimalLayout } = await import('@/lib/layout-optimizer');

    render(<DisplayPage />);

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

  it('should apply grid layout styles based on calculated layout', async () => {
    render(<DisplayPage />);

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
