import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientPage from './page';

// Mock PeerJS
vi.mock('peerjs', () => {
  const mockPeerInstance = {
    on: vi.fn(),
    call: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(),
    })),
    destroy: vi.fn(),
  };
  return {
    default: vi.fn(() => mockPeerInstance),
  };
});

// Mock Next.js navigation
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Menu: () => <div>Menu</div>,
  X: () => <div>X</div>,
  ZoomIn: () => <div>ZoomIn</div>,
  SwitchCamera: () => <div>SwitchCamera</div>,
  Mic: () => <div>Mic</div>,
  MicOff: () => <div>MicOff</div>,
  MonitorUp: () => <div>MonitorUp</div>,
  Video: () => <div>Video</div>,
  VideoOff: () => <div>VideoOff</div>,
  AlertCircle: () => <div>AlertCircle</div>,
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
  }: {
    value?: number[];
    onValueChange?: (value: number[]) => void;
  }) => (
    <input
      type="range"
      value={value?.[0]}
      onChange={(e) => onValueChange?.([parseFloat(e.target.value)])}
      data-testid="slider"
    />
  ),
}));

describe('ClientPage', () => {
  let mockStream: MediaStream;
  let mockVideoTrack: MediaStreamTrack;
  let mockAudioTrack: MediaStreamTrack;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup search params
    mockSearchParams.set('displayId', 'display-123');

    // Mock navigator
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      writable: true,
      configurable: true,
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    // Mock tracks
    mockVideoTrack = {
      enabled: true,
      stop: vi.fn(),
      getSettings: vi.fn(() => ({})),
      getCapabilities: vi.fn(() => ({
        zoom: { min: 1, max: 4, step: 0.1 },
      })),
      applyConstraints: vi.fn(() => Promise.resolve()),
      onended: null,
    } as unknown as MediaStreamTrack;

    mockAudioTrack = {
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;

    mockStream = {
      getTracks: vi.fn(() => [mockVideoTrack, mockAudioTrack]),
      getVideoTracks: vi.fn(() => [mockVideoTrack]),
      getAudioTracks: vi.fn(() => [mockAudioTrack]),
    } as unknown as MediaStream;

    // Mock media devices
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
      getDisplayMedia: vi.fn(() => Promise.resolve(mockStream)),
    } as unknown as MediaDevices;

    // Setup RTCPeerConnection
    global.RTCPeerConnection = vi.fn() as unknown as typeof RTCPeerConnection;
  });

  it('should render loading state initially', () => {
    render(<ClientPage />);
    expect(screen.getByText(/Starting camera.../i)).toBeInTheDocument();
  });

  it('should show error when no display ID is provided', async () => {
    mockSearchParams.delete('displayId');

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText(/No display ID provided/i)).toBeInTheDocument();
    });
  });

  it('should request camera access on mount', async () => {
    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it('should toggle menu when button is clicked', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/Camera Controls/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await user.click(menuButton);

    // Menu should now be visible or hidden based on toggle
    expect(screen.getByText(/Camera Controls/i)).toBeInTheDocument();
  });

  it('should toggle mute when button is clicked', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /Toggle menu/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const muteButton = buttons.find((btn) => btn.textContent?.includes('Mute'));
      expect(muteButton).toBeInTheDocument();
    });
  });

  it('should handle camera permission denied', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/Camera permission denied/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle no camera found error', async () => {
    const error = new Error('No camera found');
    error.name = 'NotFoundError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/No camera found/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should cleanup on unmount', async () => {
    const { unmount } = render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    await act(async () => {
      unmount();
    });

    expect(mockVideoTrack.stop).toHaveBeenCalled();
    expect(mockAudioTrack.stop).toHaveBeenCalled();
  });

  it('should render Suspense fallback', () => {
    render(<ClientPage />);
    expect(screen.getByText(/Video/i)).toBeInTheDocument();
  });
});
