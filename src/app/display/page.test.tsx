import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import DisplayPage from './page';

// Mock PeerJS module with vi.hoisted
const { mockPeerInstance: _mockPeerInstance, MockPeer } = vi.hoisted(() => {
  const mockPeerInstance = {
    on: vi.fn(),
    destroy: vi.fn(),
    id: 'mock-peer-id',
  };
  const MockPeer = vi.fn(() => mockPeerInstance);
  return { mockPeerInstance, MockPeer };
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
    toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mockqrcode')),
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
    const Peer = (await import('peerjs')).default;
    const mockPeerInstance = vi.mocked(Peer).mock.results[0]?.value;

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
    const Peer = (await import('peerjs')).default;
    const mockPeerInstance = vi.mocked(Peer).mock.results[0]?.value;

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
});
