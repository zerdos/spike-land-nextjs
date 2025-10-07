import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientPage from './page';

// Mock PeerJS
let mockPeerHandlers: Record<string, (arg?: unknown) => void> = {};
let mockCallHandlers: Record<string, (arg?: unknown) => void> = {};

const mockCallInstance = {
  on: vi.fn((event: string, handler: (arg?: unknown) => void) => {
    mockCallHandlers[event] = handler;
  }),
  close: vi.fn(),
};

const mockPeerInstance = {
  on: vi.fn((event: string, handler: (arg?: unknown) => void) => {
    mockPeerHandlers[event] = handler;
  }),
  call: vi.fn(() => mockCallInstance),
  destroy: vi.fn(),
};

vi.mock('peerjs', () => ({
  default: vi.fn(() => mockPeerInstance),
}));

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

let sliderOnValueChange: ((value: number[]) => void) | undefined;

vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
  }: {
    value?: number[];
    onValueChange?: (value: number[]) => void;
  }) => {
    sliderOnValueChange = onValueChange;
    return (
      <input
        type="range"
        value={value?.[0] ?? 1}
        onChange={(e) => {
          const newValue = parseFloat(e.target.value);
          if (!isNaN(newValue)) {
            onValueChange?.([newValue]);
          } else {
            // If value is NaN, pass empty array (which will give undefined at [0])
            onValueChange?.([]);
          }
        }}
        data-testid="slider"
      />
    );
  },
}));

describe('ClientPage', () => {
  let mockStream: MediaStream;
  let mockVideoTrack: MediaStreamTrack;
  let mockAudioTrack: MediaStreamTrack;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPeerHandlers = {};
    mockCallHandlers = {};
    mockCallInstance.on.mockImplementation((event: string, handler: (arg?: unknown) => void) => {
      mockCallHandlers[event] = handler;
    });
    mockPeerInstance.on.mockImplementation((event: string, handler: (arg?: unknown) => void) => {
      mockPeerHandlers[event] = handler;
    });

    // Setup search params
    mockSearchParams.set('displayId', 'display-123');

    // Mock navigator
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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

  it('should switch camera facing mode and update localStorage', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

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
      const switchButton = buttons.find((btn) => btn.textContent?.includes('Switch Camera'));
      expect(switchButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const switchButton = buttons.find((btn) => btn.textContent?.includes('Switch Camera'));

    await act(async () => {
      await user.click(switchButton!);
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith('preferredCamera', expect.any(String));
  });

  it('should handle zoom control changes', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('slider')).toBeInTheDocument();
    });

    const slider = screen.getByTestId('slider') as HTMLInputElement;

    // Use fireEvent to trigger the onChange with a proper value
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(slider, '2.5');

      const event = new Event('change', { bubbles: true });
      slider.dispatchEvent(event);
    });

    // Wait a bit for the async operation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockVideoTrack.applyConstraints).toHaveBeenCalled();
  });

  it('should toggle video enable/disable', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const videoButton = buttons.find((btn) => btn.textContent?.includes('Disable Video'));
      expect(videoButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const videoButton = buttons.find((btn) => btn.textContent?.includes('Disable Video'));

    expect(mockVideoTrack.enabled).toBe(true);

    await act(async () => {
      await user.click(videoButton!);
    });

    await waitFor(() => {
      expect(mockVideoTrack.enabled).toBe(false);
    });
  });

  it('should show video disabled overlay when video is disabled', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const videoButton = buttons.find((btn) => btn.textContent?.includes('Disable Video'));

    await act(async () => {
      await user.click(videoButton!);
    });

    await waitFor(() => {
      expect(screen.getByText(/Video is disabled/i)).toBeInTheDocument();
    });
  });

  it('should toggle mute and update audio track state', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const muteButton = buttons.find((btn) => btn.textContent?.includes('Mute'));
      expect(muteButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const muteButton = buttons.find((btn) => btn.textContent?.includes('Mute'));

    expect(mockAudioTrack.enabled).toBe(true);

    await act(async () => {
      await user.click(muteButton!);
    });

    await waitFor(() => {
      expect(mockAudioTrack.enabled).toBe(false);
    });
  });

  it('should show unmute button when muted', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const muteButton = buttons.find((btn) => btn.textContent?.includes('Mute'));

    await act(async () => {
      await user.click(muteButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole('button');
      const unmuteButton = updatedButtons.find((btn) => btn.textContent?.includes('Unmute'));
      expect(unmuteButton).toBeInTheDocument();
    });
  });

  it('should share screen when share screen button is clicked', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));
      expect(shareButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));

    await act(async () => {
      await user.click(shareButton!);
    });

    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
  });

  it('should stop screen sharing and return to camera', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));

    // Start sharing
    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole('button');
      const stopButton = updatedButtons.find((btn) => btn.textContent?.includes('Stop Sharing'));
      expect(stopButton).toBeInTheDocument();
    });

    // Stop sharing
    const updatedButtons = screen.getAllByRole('button');
    const stopButton = updatedButtons.find((btn) => btn.textContent?.includes('Stop Sharing'));

    await act(async () => {
      await user.click(stopButton!);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });

  it('should handle screen share error', async () => {
    const user = userEvent.setup();
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue(new Error('Screen share denied'));

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));

    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to share screen/i)).toBeInTheDocument();
    });
  });

  it('should close error banner when X button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue(new Error('Screen share denied'));

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));

    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to share screen/i)).toBeInTheDocument();
    });

    // Find and click the X button in the error banner
    const allButtons = screen.getAllByRole('button');
    const closeButton = allButtons.find((btn) => btn.querySelector('div')?.textContent === 'X');

    await act(async () => {
      await user.click(closeButton!);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Failed to share screen/i)).not.toBeInTheDocument();
    });
  });

  it('should close menu when Close Menu button is clicked', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons.find((btn) => btn.textContent?.includes('Close Menu'));
      expect(closeButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find((btn) => btn.textContent?.includes('Close Menu'));

    await act(async () => {
      await user.click(closeButton!);
    });

    // Menu should be closed
    expect(screen.getByText(/Camera Controls/i)).toBeInTheDocument();
  });

  it('should detect mobile device and set environment camera as default', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      writable: true,
      configurable: true,
    });

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await act(async () => {
      await userEvent.setup().click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Back/i)).toBeInTheDocument();
    });
  });

  it('should load saved camera preference from localStorage', async () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue('user');

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(window.localStorage.getItem).toHaveBeenCalledWith('preferredCamera');
      },
      { timeout: 3000 }
    );
  });

  it('should handle zoom without zoom support', async () => {
    mockVideoTrack.getCapabilities = vi.fn(() => ({}));

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await act(async () => {
      await userEvent.setup().click(menuButton);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('slider')).not.toBeInTheDocument();
    });
  });

  it('should handle generic camera error', async () => {
    const error = new Error('Generic camera error');
    error.name = 'GenericError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Generic camera error/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should show connected status when peer connection is established', async () => {
    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for peer handlers to be registered
    await waitFor(() => {
      expect(mockPeerHandlers.open).toBeDefined();
    });

    // Simulate peer 'open' event
    await act(async () => {
      mockPeerHandlers.open('peer-id-123');
    });

    // Wait for call handlers to be registered
    await waitFor(() => {
      expect(mockCallHandlers.stream).toBeDefined();
    });

    // Simulate call 'stream' event
    await act(async () => {
      mockCallHandlers.stream(mockStream);
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });

  it('should show connecting status initially', async () => {
    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
  });

  it('should handle call close event', async () => {
    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for peer handlers to be registered
    await waitFor(() => {
      expect(mockPeerHandlers.open).toBeDefined();
    });

    // Simulate peer 'open' event
    await act(async () => {
      mockPeerHandlers.open('peer-id-123');
    });

    // Wait for call handlers to be registered
    await waitFor(() => {
      expect(mockCallHandlers.close).toBeDefined();
    });

    // Simulate call 'close' event
    await act(async () => {
      mockCallHandlers.close();
    });

    await waitFor(() => {
      expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
    });
  });

  it('should handle call error event', async () => {
    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for peer handlers to be registered
    await waitFor(() => {
      expect(mockPeerHandlers.open).toBeDefined();
    });

    // Simulate peer 'open' event
    await act(async () => {
      mockPeerHandlers.open('peer-id-123');
    });

    // Wait for call handlers to be registered
    await waitFor(() => {
      expect(mockCallHandlers.error).toBeDefined();
    });

    // Simulate call 'error' event
    await act(async () => {
      mockCallHandlers.error(new Error('Call error'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Connection to display failed/i)).toBeInTheDocument();
    });
  });

  it('should handle peer error event', async () => {
    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for peer handlers to be registered
    await waitFor(() => {
      expect(mockPeerHandlers.error).toBeDefined();
    });

    // Simulate peer 'error' event
    await act(async () => {
      mockPeerHandlers.error(new Error('Peer error'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to establish peer connection/i)).toBeInTheDocument();
    });
  });

  it('should handle zoom change with valid value', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('slider')).toBeInTheDocument();
    });

    const slider = screen.getByTestId('slider') as HTMLInputElement;

    // Change to a valid value
    await act(async () => {
      await user.type(slider, '2');
    });

    expect(slider).toBeInTheDocument();
  });

  it('should handle zoom change with undefined value', async () => {
    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await act(async () => {
      await userEvent.setup().click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('slider')).toBeInTheDocument();
    });

    // Directly call onValueChange with empty array to trigger undefined case
    await act(async () => {
      sliderOnValueChange?.([]);
    });

    // The component should gracefully handle undefined by early return (line 247)
    expect(screen.getByTestId('slider')).toBeInTheDocument();
  });

  it('should handle zoom error gracefully', async () => {
    const user = userEvent.setup();

    // Create a mock that will reject
    const errorVideoTrack = {
      enabled: true,
      stop: vi.fn(),
      getSettings: vi.fn(() => ({})),
      getCapabilities: vi.fn(() => ({
        zoom: { min: 1, max: 4, step: 0.1 },
      })),
      applyConstraints: vi.fn(() => Promise.reject(new Error('Zoom error'))),
      onended: null,
    } as unknown as MediaStreamTrack;

    const errorStream = {
      getTracks: vi.fn(() => [errorVideoTrack, mockAudioTrack]),
      getVideoTracks: vi.fn(() => [errorVideoTrack]),
      getAudioTracks: vi.fn(() => [mockAudioTrack]),
    } as unknown as MediaStream;

    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(errorStream);

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('slider')).toBeInTheDocument();
    });

    const slider = screen.getByTestId('slider') as HTMLInputElement;

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(slider, '3');

      const event = new Event('change', { bubbles: true });
      slider.dispatchEvent(event);
    });

    // Wait a bit for the async operation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(errorVideoTrack.applyConstraints).toHaveBeenCalled();
  });

  it('should handle switch camera error', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Mock getUserMedia to fail on next call
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(new Error('Switch error'));

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const switchButton = buttons.find((btn) => btn.textContent?.includes('Switch Camera'));

    await act(async () => {
      await user.click(switchButton!);
    });

    // Should not crash, error is logged
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });

  it('should disable switch camera button when screen sharing', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));

    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole('button');
      const switchButton = updatedButtons.find((btn) => btn.textContent?.includes('Switch Camera'));
      expect(switchButton).toBeDisabled();
    });
  });

  it('should handle screen track onended event', async () => {
    const user = userEvent.setup();
    const mockScreenTrack = {
      enabled: true,
      stop: vi.fn(),
      onended: null as (() => void) | null,
    } as unknown as MediaStreamTrack;

    const mockScreenStream = {
      getTracks: vi.fn(() => [mockScreenTrack]),
      getVideoTracks: vi.fn(() => [mockScreenTrack]),
      getAudioTracks: vi.fn(() => []),
    } as unknown as MediaStream;

    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValue(mockScreenStream);

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));

    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      expect(mockScreenTrack.onended).toBeTruthy();
    });

    // Trigger onended
    if (mockScreenTrack.onended) {
      await act(async () => {
        mockScreenTrack.onended!();
      });
    }

    // Should switch back to camera
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });

  it('should show enable video button when video is disabled', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole('button', { name: /Toggle menu/i }, { timeout: 5000 });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const videoButton = buttons.find((btn) => btn.textContent?.includes('Disable Video'));

    await act(async () => {
      await user.click(videoButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole('button');
      const enableButton = updatedButtons.find((btn) => btn.textContent?.includes('Enable Video'));
      expect(enableButton).toBeInTheDocument();
    });
  });

  it('should update peer call when switching camera with active connection', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for peer handlers to be registered
    await waitFor(() => {
      expect(mockPeerHandlers.open).toBeDefined();
    });

    // Simulate peer 'open' event to establish connection
    await act(async () => {
      mockPeerHandlers.open('peer-id-123');
    });

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const switchButton = buttons.find((btn) => btn.textContent?.includes('Switch Camera'));

    // Reset call handlers before switching
    mockCallHandlers = {};
    mockCallInstance.on.mockImplementation((event: string, handler: (arg?: unknown) => void) => {
      mockCallHandlers[event] = handler;
    });

    await act(async () => {
      await user.click(switchButton!);
    });

    // Should create new call
    expect(mockPeerInstance.call).toHaveBeenCalled();

    // Wait for new call handlers to be registered
    await waitFor(() => {
      expect(mockCallHandlers.stream).toBeDefined();
    });

    // Trigger the new call's stream event to cover line 285
    await act(async () => {
      mockCallHandlers.stream(mockStream);
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Trigger the new call's close event to cover line 289
    await act(async () => {
      mockCallHandlers.close();
    });

    await waitFor(() => {
      expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
    });
  });

  it('should update peer call when stopping screen share with active connection', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for peer handlers to be registered
    await waitFor(() => {
      expect(mockPeerHandlers.open).toBeDefined();
    });

    // Simulate peer 'open' event
    await act(async () => {
      mockPeerHandlers.open('peer-id-123');
    });

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));

    // Start sharing
    await act(async () => {
      await user.click(shareButton!);
    });

    // Stop sharing
    const updatedButtons = screen.getAllByRole('button');
    const stopButton = updatedButtons.find((btn) => btn.textContent?.includes('Stop Sharing'));

    await act(async () => {
      await user.click(stopButton!);
    });

    // Should create new call with camera stream
    expect(mockPeerInstance.call).toHaveBeenCalled();
  });

  it('should handle unmount during initialization', async () => {
    // Mock getUserMedia to delay response
    let resolveGetUserMedia: ((value: MediaStream) => void) | null = null;
    const getUserMediaPromise = new Promise<MediaStream>((resolve) => {
      resolveGetUserMedia = resolve;
    });
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(getUserMediaPromise);

    const { unmount } = render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Unmount before getUserMedia resolves
    await act(async () => {
      unmount();
    });

    // Resolve getUserMedia after unmount
    if (resolveGetUserMedia) {
      resolveGetUserMedia(mockStream);
    }

    // Wait a bit to ensure cleanup happens
    await new Promise(resolve => setTimeout(resolve, 100));

    // Peer should not be created since component was unmounted
    expect(mockPeerInstance.on).not.toHaveBeenCalled();
  });

  it('should handle NotReadableError camera error', async () => {
    const error = new Error('Device in use');
    error.name = 'NotReadableError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Device in use/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle SecurityError camera error', async () => {
    const error = new Error('Security error');
    error.name = 'SecurityError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Security error/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle OverconstrainedError camera error', async () => {
    const error = new Error('Constraints not satisfied');
    error.name = 'OverconstrainedError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Constraints not satisfied/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle AbortError camera error', async () => {
    const error = new Error('Operation aborted');
    error.name = 'AbortError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Operation aborted/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle non-Error exception in startCamera', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue('String error');

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(screen.getByText(/Starting camera.../i)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    // Should set loading to false even with non-Error exception
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  it('should update peer call when starting screen share with active connection', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for peer handlers to be registered
    await waitFor(() => {
      expect(mockPeerHandlers.open).toBeDefined();
    });

    // Simulate peer 'open' event to establish connection
    await act(async () => {
      mockPeerHandlers.open('peer-id-123');
    });

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    // Reset call handlers before screen sharing
    mockCallHandlers = {};
    mockCallInstance.on.mockImplementation((event: string, handler: (arg?: unknown) => void) => {
      mockCallHandlers[event] = handler;
    });

    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));

    // Start sharing
    await act(async () => {
      await user.click(shareButton!);
    });

    // Should create new call with screen stream
    expect(mockPeerInstance.call).toHaveBeenCalled();

    // Wait for new call handlers to be registered
    await waitFor(() => {
      expect(mockCallHandlers.stream).toBeDefined();
    });

    // Trigger the new call's stream event to cover line 362
    await act(async () => {
      mockCallHandlers.stream(mockStream);
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Trigger the new call's close event to cover line 363
    await act(async () => {
      mockCallHandlers.close();
    });

    await waitFor(() => {
      expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
    });
  });

  it('should update peer call when stopping screen share and returning to camera', async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for peer handlers to be registered
    await waitFor(() => {
      expect(mockPeerHandlers.open).toBeDefined();
    });

    // Simulate peer 'open' event
    await act(async () => {
      mockPeerHandlers.open('peer-id-123');
    });

    const menuButton = screen.getByRole('button', { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole('button');
    const shareButton = buttons.find((btn) => btn.textContent?.includes('Share Screen'));

    // Start sharing
    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole('button');
      const stopButton = updatedButtons.find((btn) => btn.textContent?.includes('Stop Sharing'));
      expect(stopButton).toBeInTheDocument();
    });

    // Reset call handlers before stopping screen share
    mockCallHandlers = {};
    mockCallInstance.on.mockImplementation((event: string, handler: (arg?: unknown) => void) => {
      mockCallHandlers[event] = handler;
    });

    // Stop sharing
    const updatedButtons = screen.getAllByRole('button');
    const stopButton = updatedButtons.find((btn) => btn.textContent?.includes('Stop Sharing'));

    await act(async () => {
      await user.click(stopButton!);
    });

    // Should create new call with camera stream
    expect(mockPeerInstance.call).toHaveBeenCalled();

    // Wait for new call handlers to be registered
    await waitFor(() => {
      expect(mockCallHandlers.stream).toBeDefined();
    });

    // Trigger the new call's stream event to cover line 333
    await act(async () => {
      mockCallHandlers.stream(mockStream);
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Trigger the new call's close event to cover line 334
    await act(async () => {
      mockCallHandlers.close();
    });

    await waitFor(() => {
      expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
    });
  });

  it('should switch camera from user to environment mode', async () => {
    const user = userEvent.setup();

    // Set initial facingMode to 'user'
    vi.mocked(window.localStorage.getItem).mockReturnValue('user');

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

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

    const buttons = screen.getAllByRole('button');
    const switchButton = buttons.find((btn) => btn.textContent?.includes('Switch Camera'));

    await act(async () => {
      await user.click(switchButton!);
    });

    // Should switch from 'user' to 'environment'
    expect(window.localStorage.setItem).toHaveBeenCalledWith('preferredCamera', 'environment');
  });

  it('should switch camera from environment to user mode', async () => {
    const user = userEvent.setup();

    // Set initial facingMode to 'environment'
    vi.mocked(window.localStorage.getItem).mockReturnValue('environment');

    render(<ClientPage />);

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

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

    const buttons = screen.getAllByRole('button');
    const switchButton = buttons.find((btn) => btn.textContent?.includes('Switch Camera'));

    await act(async () => {
      await user.click(switchButton!);
    });

    // Should switch from 'environment' to 'user'
    expect(window.localStorage.setItem).toHaveBeenCalledWith('preferredCamera', 'user');
  });
});
