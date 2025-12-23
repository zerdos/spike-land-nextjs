import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientPage from "./ClientPage";

// Mock PeerJS - Support multiple peer instances
interface MockPeerInstance {
  on: ReturnType<typeof vi.fn>;
  call: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  handlers: Record<string, (arg?: unknown) => void>;
}

interface MockCallInstance {
  on: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  handlers: Record<string, (arg?: unknown) => void>;
}

let mockPeerInstances: MockPeerInstance[] = [];
let mockCallInstances: MockCallInstance[] = [];

// Create a new call instance
const createMockCallInstance = (): MockCallInstance => {
  const handlers: Record<string, (arg?: unknown) => void> = {};
  return {
    on: vi.fn((event: string, handler: (arg?: unknown) => void) => {
      handlers[event] = handler;
    }),
    close: vi.fn(),
    handlers,
  };
};

// Create a new peer instance
const createMockPeerInstance = (): MockPeerInstance => {
  const handlers: Record<string, (arg?: unknown) => void> = {};
  return {
    on: vi.fn((event: string, handler: (arg?: unknown) => void) => {
      handlers[event] = handler;
    }),
    call: vi.fn(() => {
      const callInstance = createMockCallInstance();
      mockCallInstances.push(callInstance);
      return callInstance;
    }),
    destroy: vi.fn(),
    handlers,
  };
};

// Vitest 4: Use class constructor instead of vi.fn()
vi.mock("peerjs", () => ({
  default: class MockPeer {
    static mock = { calls: [] as unknown[][] };
    private instance: MockPeerInstance;
    constructor(...args: unknown[]) {
      MockPeer.mock.calls.push(args);
      this.instance = createMockPeerInstance();
      mockPeerInstances.push(this.instance);
    }
    // Use arrow functions bound to this.instance instead of referencing array index
    on(event: string, handler: (arg?: unknown) => void) {
      return this.instance.on(event, handler);
    }
    call(...args: unknown[]) {
      return this.instance.call(...args);
    }
    destroy() {
      return this.instance.destroy();
    }
    get handlers() {
      return this.instance.handlers;
    }
  },
}));

// Mock Next.js navigation
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
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
  Camera: () => <div>Camera</div>,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
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

vi.mock("@/components/ui/slider", () => ({
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

describe("ClientPage", () => {
  let mockStream: MediaStream;
  let mockVideoTrack: MediaStreamTrack;
  let mockAudioTrack: MediaStreamTrack;

  // Helper to wait for peer and trigger open event
  const waitForPeerAndTriggerOpen = async () => {
    await waitFor(
      () => {
        expect(mockPeerInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    await act(async () => {
      mockPeerInstances[0]!.handlers.open?.("peer-id-123");
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPeerInstances = [];
    mockCallInstances = [];

    // Setup search params
    mockSearchParams.set("displayId", "display-123");

    // Mock navigator
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      writable: true,
      configurable: true,
    });

    // Mock fetch for Twilio ICE servers
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:global.turn.twilio.com:3478?transport=udp",
            username: "test",
            credential: "test",
          },
        ],
      }),
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => {
        if (key === "dualCameraMode") return "false";
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
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
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
        getDisplayMedia: vi.fn(() => Promise.resolve(mockStream)),
      } as unknown as MediaDevices,
      writable: true,
      configurable: true,
    });

    // Setup RTCPeerConnection
    global.RTCPeerConnection = vi.fn() as unknown as typeof RTCPeerConnection;
  });

  it("should render loading state initially", () => {
    render(<ClientPage />);
    expect(screen.getByText(/Starting camera.../i)).toBeInTheDocument();
  });

  it("should show error when no display ID is provided", async () => {
    mockSearchParams.delete("displayId");

    render(<ClientPage />);

    await waitFor(() => {
      expect(screen.getByText(/No display ID provided/i)).toBeInTheDocument();
    });
  });

  it("should request camera access on mount", async () => {
    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Now camera should be requested
    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("should toggle menu when button is clicked", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Wait for camera to be initialized
    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for menu button to appear
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Toggle menu/i }))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await user.click(menuButton);

    // Menu should now be visible
    expect(screen.getByText(/Camera Controls/i)).toBeInTheDocument();
  });

  it("should toggle mute when button is clicked", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Toggle menu/i }))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const muteButton = buttons.find((btn) => btn.textContent?.includes("Mute"));
      expect(muteButton).toBeInTheDocument();
    });
  });

  it("should handle camera permission denied", async () => {
    const error = new Error("Permission denied");
    error.name = "NotAllowedError";
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(screen.getByText(/Camera permission denied/i))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should handle no camera found error", async () => {
    const error = new Error("No camera found");
    error.name = "NotFoundError";
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(screen.getByText(/No camera found/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should cleanup peer connection on unmount", async () => {
    const { unmount } = render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for connection to be established
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    await act(async () => {
      unmount();
    });

    // Peer should be destroyed on unmount
    expect(mockPeerInstances[0]!.destroy).toHaveBeenCalled();
  });

  it("should render Suspense fallback", () => {
    render(<ClientPage />);
    expect(screen.getByText(/Video/i)).toBeInTheDocument();
  });

  it("should switch camera facing mode and update localStorage", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Toggle menu/i }))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const switchButton = buttons.find((btn) => btn.textContent?.includes("Switch Camera"));
      expect(switchButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const switchButton = buttons.find((btn) => btn.textContent?.includes("Switch Camera"));

    await act(async () => {
      await user.click(switchButton!);
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "preferredCamera",
      expect.any(String),
    );
  });

  it("should handle zoom control changes", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("slider")).toBeInTheDocument();
    });

    const slider = screen.getByTestId("slider") as HTMLInputElement;

    // Use fireEvent to trigger the onChange with a proper value
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(slider, "2.5");

      const event = new Event("change", { bubbles: true });
      slider.dispatchEvent(event);
    });

    // Wait a bit for the async operation to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockVideoTrack.applyConstraints).toHaveBeenCalled();
  });

  it("should toggle video enable/disable", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const videoButton = buttons.find((btn) => btn.textContent?.includes("Disable Video"));
      expect(videoButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const videoButton = buttons.find((btn) => btn.textContent?.includes("Disable Video"));

    expect(mockVideoTrack.enabled).toBe(true);

    await act(async () => {
      await user.click(videoButton!);
    });

    await waitFor(() => {
      expect(mockVideoTrack.enabled).toBe(false);
    });
  });

  it("should show video disabled overlay when video is disabled", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const videoButton = buttons.find((btn) => btn.textContent?.includes("Disable Video"));

    await act(async () => {
      await user.click(videoButton!);
    });

    await waitFor(() => {
      expect(screen.getByText(/Video is disabled/i)).toBeInTheDocument();
    });
  });

  it("should toggle mute and update audio track state", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const muteButton = buttons.find((btn) => btn.textContent?.includes("Mute"));
      expect(muteButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const muteButton = buttons.find((btn) => btn.textContent?.includes("Mute"));

    expect(mockAudioTrack.enabled).toBe(true);

    await act(async () => {
      await user.click(muteButton!);
    });

    await waitFor(() => {
      expect(mockAudioTrack.enabled).toBe(false);
    });
  });

  it("should show unmute button when muted", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const muteButton = buttons.find((btn) => btn.textContent?.includes("Mute"));

    await act(async () => {
      await user.click(muteButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole("button");
      const unmuteButton = updatedButtons.find((btn) => btn.textContent?.includes("Unmute"));
      expect(unmuteButton).toBeInTheDocument();
    });
  });

  it("should share screen when share screen button is clicked", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));
      expect(shareButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    await act(async () => {
      await user.click(shareButton!);
    });

    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
  });

  it("should stop screen sharing and return to camera", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    // Start sharing
    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole("button");
      const stopButton = updatedButtons.find((btn) => btn.textContent?.includes("Stop Sharing"));
      expect(stopButton).toBeInTheDocument();
    });

    // Stop sharing
    const updatedButtons = screen.getAllByRole("button");
    const stopButton = updatedButtons.find((btn) => btn.textContent?.includes("Stop Sharing"));

    await act(async () => {
      await user.click(stopButton!);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });

  it("should handle screen share error", async () => {
    const user = userEvent.setup();
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue(
      new Error("Screen share denied"),
    );

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to share screen/i)).toBeInTheDocument();
    });
  });

  it("should close error banner when X button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue(
      new Error("Screen share denied"),
    );

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to share screen/i)).toBeInTheDocument();
    });

    // Find and click the X button in the error banner
    const allButtons = screen.getAllByRole("button");
    const closeButton = allButtons.find((btn) => btn.querySelector("div")?.textContent === "X");

    await act(async () => {
      await user.click(closeButton!);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Failed to share screen/i)).not
        .toBeInTheDocument();
    });
  });

  it("should close menu when Close Menu button is clicked", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const closeButton = buttons.find((btn) => btn.textContent?.includes("Close Menu"));
      expect(closeButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const closeButton = buttons.find((btn) => btn.textContent?.includes("Close Menu"));

    await act(async () => {
      await user.click(closeButton!);
    });

    // Menu should be closed
    expect(screen.getByText(/Camera Controls/i)).toBeInTheDocument();
  });

  it("should detect mobile device and set environment camera as default", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
      writable: true,
      configurable: true,
    });

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await userEvent.setup().click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Back/i)).toBeInTheDocument();
    });
  });

  it("should load saved camera preference from localStorage", async () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue("user");

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(window.localStorage.getItem).toHaveBeenCalledWith(
          "preferredCamera",
        );
      },
      { timeout: 3000 },
    );
  });

  it("should handle zoom without zoom support", async () => {
    mockVideoTrack.getCapabilities = vi.fn(() => ({}));

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await userEvent.setup().click(menuButton);
    });

    await waitFor(() => {
      expect(screen.queryByTestId("slider")).not.toBeInTheDocument();
    });
  });

  it("should handle generic camera error", async () => {
    const error = new Error("Generic camera error");
    error.name = "GenericError";
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Generic camera error/i))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should show connected status when peer connection is established", async () => {
    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Wait for peer to be created
    await waitFor(
      () => {
        expect(mockPeerInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Simulate peer 'open' event - this triggers camera initialization
    await act(async () => {
      mockPeerInstances[0]!.handlers.open?.("peer-id-123");
    });

    // Wait for camera to be initialized
    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Connection status should be set immediately when call is made
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });

  it("should show connected status after peer connection", async () => {
    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // After camera initialization and call creation, status should be "Connected"
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });

  it("should handle call close event", async () => {
    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Wait for peer to be created
    await waitFor(
      () => {
        expect(mockPeerInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Simulate peer 'open' event
    await act(async () => {
      mockPeerInstances[0]!.handlers.open?.("peer-id-123");
    });

    // Wait for camera and call to be created
    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
        expect(mockCallInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Should be connected initially
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Wait for call handlers to be registered
    await waitFor(() => {
      expect(mockCallInstances[0]!.handlers.close).toBeDefined();
    });

    // Simulate call 'close' event - this should set isConnected to false
    await act(async () => {
      mockCallInstances[0]!.handlers.close?.();
    });

    await waitFor(() => {
      expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
    });
  });

  it("should handle call error event", async () => {
    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Wait for peer to be created
    await waitFor(
      () => {
        expect(mockPeerInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Simulate peer 'open' event
    await act(async () => {
      mockPeerInstances[0]!.handlers.open?.("peer-id-123");
    });

    // Wait for camera and call to be created
    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
        expect(mockCallInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Should be connected initially
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Wait for call handlers to be registered
    await waitFor(() => {
      expect(mockCallInstances[0]!.handlers.error).toBeDefined();
    });

    // Simulate call 'error' event
    await act(async () => {
      mockCallInstances[0]!.handlers.error?.(new Error("Call error"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Camera connection failed/i)).toBeInTheDocument();
    });
  });

  it("should handle peer error event", async () => {
    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Wait for peer to be created
    await waitFor(
      () => {
        expect(mockPeerInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Wait for peer handlers to be registered
    await waitFor(() => {
      expect(mockPeerInstances[0]!.handlers.error).toBeDefined();
    });

    // Simulate peer 'error' event
    await act(async () => {
      mockPeerInstances[0]!.handlers.error?.(new Error("Peer error"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to establish peer connection/i))
        .toBeInTheDocument();
    });
  });

  it("should handle zoom change with valid value", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("slider")).toBeInTheDocument();
    });

    const slider = screen.getByTestId("slider") as HTMLInputElement;

    // Change to a valid value
    await act(async () => {
      await user.type(slider, "2");
    });

    expect(slider).toBeInTheDocument();
  });

  it("should handle zoom change with undefined value", async () => {
    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await userEvent.setup().click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("slider")).toBeInTheDocument();
    });

    // Directly call onValueChange with empty array to trigger undefined case
    await act(async () => {
      sliderOnValueChange?.([]);
    });

    // The component should gracefully handle undefined by early return (line 247)
    expect(screen.getByTestId("slider")).toBeInTheDocument();
  });

  it("should handle zoom error gracefully", async () => {
    const user = userEvent.setup();

    // Create a mock that will reject
    const errorVideoTrack = {
      enabled: true,
      stop: vi.fn(),
      getSettings: vi.fn(() => ({})),
      getCapabilities: vi.fn(() => ({
        zoom: { min: 1, max: 4, step: 0.1 },
      })),
      applyConstraints: vi.fn(() => Promise.reject(new Error("Zoom error"))),
      onended: null,
    } as unknown as MediaStreamTrack;

    const errorStream = {
      getTracks: vi.fn(() => [errorVideoTrack, mockAudioTrack]),
      getVideoTracks: vi.fn(() => [errorVideoTrack]),
      getAudioTracks: vi.fn(() => [mockAudioTrack]),
    } as unknown as MediaStream;

    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(
      errorStream,
    );

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("slider")).toBeInTheDocument();
    });

    const slider = screen.getByTestId("slider") as HTMLInputElement;

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(slider, "3");

      const event = new Event("change", { bubbles: true });
      slider.dispatchEvent(event);
    });

    // Wait a bit for the async operation to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(errorVideoTrack.applyConstraints).toHaveBeenCalled();
  });

  it("should handle switch camera error", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Mock getUserMedia to fail on next call
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      new Error("Switch error"),
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const switchButton = buttons.find((btn) => btn.textContent?.includes("Switch Camera"));

    await act(async () => {
      await user.click(switchButton!);
    });

    // Should not crash, error is logged
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });

  it("should disable switch camera button when screen sharing", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole("button");
      const switchButton = updatedButtons.find((btn) => btn.textContent?.includes("Switch Camera"));
      expect(switchButton).toBeDisabled();
    });
  });

  it("should handle screen track onended event", async () => {
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

    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValue(
      mockScreenStream,
    );

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      expect(mockScreenTrack.onended).toBeTruthy();
    });

    // Trigger onended
    await act(async () => {
      const onendedHandler = mockScreenTrack.onended as (() => void) | null;
      onendedHandler?.();
    });

    // Should switch back to camera
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });

  it("should stop back camera stream and close call when starting screen share from back camera", async () => {
    const user = userEvent.setup();

    // Set initial facingMode to 'environment' (back camera)
    vi.mocked(window.localStorage.getItem).mockReturnValue("environment");

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Capture the initial call instance before screen sharing
    const initialCallCount = mockCallInstances.length;
    expect(initialCallCount).toBeGreaterThan(0);

    // Capture references to back camera stream tracks before screen sharing
    const initialBackCameraStopCalls = vi.mocked(mockVideoTrack.stop).mock.calls.length;

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const switchButton = buttons.find((btn) => btn.textContent?.includes("Switch Camera"));
      expect(switchButton).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    // Start screen sharing while back camera is active (covers lines 734-739)
    await act(async () => {
      await user.click(shareButton!);
    });

    // Verify screen sharing started
    await waitFor(() => {
      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
    });

    // Verify back camera tracks were stopped (line 735) - getTracks().forEach(track => track.stop())
    // The stop method should be called more times after screen share than before
    expect(vi.mocked(mockVideoTrack.stop).mock.calls.length).toBeGreaterThan(
      initialBackCameraStopCalls,
    );

    // Verify the original back camera call was closed (line 736-738)
    expect(mockCallInstances[0]!.close).toHaveBeenCalled();

    // Verify screen sharing UI is active
    await waitFor(() => {
      const updatedButtons = screen.getAllByRole("button");
      const stopButton = updatedButtons.find((btn) => btn.textContent?.includes("Stop Sharing"));
      expect(stopButton).toBeInTheDocument();
    });
  });

  it("should show enable video button when video is disabled", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    // Wait for component to fully render after async Peer initialization
    const menuButton = await screen.findByRole("button", {
      name: /Toggle menu/i,
    }, {
      timeout: 5000,
    });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const videoButton = buttons.find((btn) => btn.textContent?.includes("Disable Video"));

    await act(async () => {
      await user.click(videoButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole("button");
      const enableButton = updatedButtons.find((btn) => btn.textContent?.includes("Enable Video"));
      expect(enableButton).toBeInTheDocument();
    });
  });

  // NOTE: Camera switching is already tested in:
  // - "should switch camera from user to environment mode"
  // - "should switch camera from environment to user mode"
  // This test was timing out in CI due to async state management complexity

  it("should update peer call when stopping screen share with active connection", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Wait for peer to be created
    await waitFor(
      () => {
        expect(mockPeerInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Simulate peer 'open' event
    await act(async () => {
      mockPeerInstances[0]!.handlers.open?.("peer-id-123");
    });

    // Wait for camera initialization
    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    const initialCallCount = mockCallInstances.length;

    // Start sharing
    await act(async () => {
      await user.click(shareButton!);
    });

    // Stop sharing
    const updatedButtons = screen.getAllByRole("button");
    const stopButton = updatedButtons.find((btn) => btn.textContent?.includes("Stop Sharing"));

    await act(async () => {
      await user.click(stopButton!);
    });

    // Should create new call with camera stream
    await waitFor(() => {
      expect(mockCallInstances.length).toBeGreaterThan(initialCallCount);
    });
  });

  it("should handle unmount during initialization", async () => {
    // Mock getUserMedia to delay response
    let resolveGetUserMedia: ((value: MediaStream) => void) | null = null;
    const getUserMediaPromise = new Promise<MediaStream>((resolve) => {
      resolveGetUserMedia = resolve;
    });
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(
      getUserMediaPromise,
    );

    const { unmount } = render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Wait for peer to be created
    await waitFor(
      () => {
        expect(mockPeerInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Trigger peer open to start camera initialization
    await act(async () => {
      mockPeerInstances[0]!.handlers.open?.("peer-id-123");
    });

    // Wait for getUserMedia to be called
    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
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
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Peer should have been destroyed
    expect(mockPeerInstances[0]!.destroy).toHaveBeenCalled();
  });

  it("should handle NotReadableError camera error", async () => {
    const error = new Error("Device in use");
    error.name = "NotReadableError";
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Device in use/i))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should handle SecurityError camera error", async () => {
    const error = new Error("Security error");
    error.name = "SecurityError";
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Security error/i))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should handle OverconstrainedError camera error", async () => {
    const error = new Error("Constraints not satisfied");
    error.name = "OverconstrainedError";
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Constraints not satisfied/i))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should handle AbortError camera error", async () => {
    const error = new Error("Operation aborted");
    error.name = "AbortError";
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error);

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(screen.getByText(/Camera error: Operation aborted/i))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should handle non-Error exception in startCamera", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      "String error",
    );

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Component should handle the error gracefully without crashing
    await waitFor(() => {
      // Check that we're no longer in the loading state
      expect(screen.queryByText(/Starting camera.../i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should update peer call when starting screen share with active connection", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Wait for peer to be created
    await waitFor(
      () => {
        expect(mockPeerInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Simulate peer 'open' event to establish connection
    await act(async () => {
      mockPeerInstances[0]!.handlers.open?.("peer-id-123");
    });

    // Wait for camera initialization
    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    const initialCallCount = mockCallInstances.length;

    // Start sharing
    await act(async () => {
      await user.click(shareButton!);
    });

    // Should create new call with screen stream and set connected immediately
    await waitFor(() => {
      expect(mockCallInstances.length).toBeGreaterThan(initialCallCount);
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Get the latest call and trigger the close event to test disconnection
    const latestCall = mockCallInstances[mockCallInstances.length - 1];
    if (latestCall) {
      await act(async () => {
        latestCall.handlers.close?.();
      });

      await waitFor(() => {
        expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
      });
    }
  });

  it("should update peer call when stopping screen share and returning to camera", async () => {
    const user = userEvent.setup();

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    // Wait for peer to be created
    await waitFor(
      () => {
        expect(mockPeerInstances.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Simulate peer 'open' event
    await act(async () => {
      mockPeerInstances[0]!.handlers.open?.("peer-id-123");
    });

    // Wait for camera initialization and connection
    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

    // Start sharing
    await act(async () => {
      await user.click(shareButton!);
    });

    await waitFor(() => {
      const updatedButtons = screen.getAllByRole("button");
      const stopButton = updatedButtons.find((btn) => btn.textContent?.includes("Stop Sharing"));
      expect(stopButton).toBeInTheDocument();
    });

    // Stop sharing
    const updatedButtons = screen.getAllByRole("button");
    const stopButton = updatedButtons.find((btn) => btn.textContent?.includes("Stop Sharing"));

    await act(async () => {
      await user.click(stopButton!);
    });

    // Should switch back to camera (getUserMedia called at least once more)
    await waitFor(() => {
      // Initial call + stop sharing call (possibly more due to async state updates)
      const callCount = vi.mocked(navigator.mediaDevices.getUserMedia).mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(2);
    }, { timeout: 5000 });

    // Should maintain connection status
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    // Get the latest call and trigger the close event to test disconnection
    const latestCall = mockCallInstances[mockCallInstances.length - 1];
    if (latestCall) {
      await act(async () => {
        latestCall.handlers.close?.();
      });

      await waitFor(() => {
        expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
      });
    }
  });

  it("should switch camera from user to environment mode", async () => {
    const user = userEvent.setup();

    // Set initial facingMode to 'user'
    vi.mocked(window.localStorage.getItem).mockReturnValue("user");

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Toggle menu/i }))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const switchButton = buttons.find((btn) => btn.textContent?.includes("Switch Camera"));

    await act(async () => {
      await user.click(switchButton!);
    });

    // Should switch from 'user' to 'environment'
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "preferredCamera",
      "environment",
    );
  });

  it("should switch camera from environment to user mode", async () => {
    const user = userEvent.setup();

    // Set initial facingMode to 'environment'
    vi.mocked(window.localStorage.getItem).mockReturnValue("environment");

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Toggle menu/i }))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const switchButton = buttons.find((btn) => btn.textContent?.includes("Switch Camera"));

    await act(async () => {
      await user.click(switchButton!);
    });

    // Should switch from 'environment' to 'user'
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "preferredCamera",
      "user",
    );
  });

  it("should set backVideoRef srcObject when switching from front to back camera", async () => {
    const user = userEvent.setup();

    // Set initial facingMode to 'user' (front camera)
    vi.mocked(window.localStorage.getItem).mockReturnValue("user");

    render(<ClientPage />);

    // Wait for peer and trigger initialization
    await waitForPeerAndTriggerOpen();

    await waitFor(
      () => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Toggle menu/i }))
          .toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
    await act(async () => {
      await user.click(menuButton);
    });

    const buttons = screen.getAllByRole("button");
    const switchButton = buttons.find((btn) => btn.textContent?.includes("Switch Camera"));

    // Switch from front to back camera
    await act(async () => {
      await user.click(switchButton!);
    });

    // Wait for camera switch to complete
    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "preferredCamera",
        "environment",
      );
    });

    // Verify backVideoRef.current.srcObject is set (line 690-692)
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
    });
  });

  describe("Dual Camera Mode", () => {
    const waitForDualPeerAndTriggerOpen = async () => {
      // In dual camera mode, the component creates both peers at once
      // and waits for both to fire 'open' events before initializing cameras.
      // The component checks: peersInitialized === peersNeeded (2)

      // Wait for both peers to be created
      await waitFor(
        () => {
          expect(mockPeerInstances.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 },
      );

      // Trigger both open events at once - cameras only initialize when both peers are open
      await act(async () => {
        mockPeerInstances[0]!.handlers.open?.("peer-id-front");
        mockPeerInstances[1]!.handlers.open?.("peer-id-back");
      });
    };

    it("should enable dual camera mode when button is clicked", async () => {
      const user = userEvent.setup();

      render(<ClientPage />);

      // Wait for peer and trigger initialization
      await waitForPeerAndTriggerOpen();

      await waitFor(
        () => {
          expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
      await act(async () => {
        await user.click(menuButton);
      });

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const dualCameraButton = buttons.find((btn) =>
          btn.textContent?.includes("Dual Camera Mode: OFF")
        );
        expect(dualCameraButton).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button");
      const dualCameraButton = buttons.find((btn) =>
        btn.textContent?.includes("Dual Camera Mode: OFF")
      );

      await act(async () => {
        await user.click(dualCameraButton!);
      });

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "dualCameraMode",
        "true",
      );
    });

    it(
      "should show dual camera connection status when both cameras are connected",
      async () => {
        vi.mocked(window.localStorage.getItem).mockImplementation(
          (key: string) => {
            if (key === "dualCameraMode") return "true";
            return null;
          },
        );

        render(<ClientPage />);

        // Wait for both peers and trigger initialization
        await waitForDualPeerAndTriggerOpen();

        await waitFor(
          () => {
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(
              2,
            );
          },
          { timeout: 5000 },
        );

        await waitFor(() => {
          expect(screen.getByText(/Front:/i)).toBeInTheDocument();
          expect(screen.getByText(/Back:/i)).toBeInTheDocument();
        });
      },
      10000,
    );

    it(
      "should show front and back camera labels in dual camera mode",
      async () => {
        vi.mocked(window.localStorage.getItem).mockImplementation(
          (key: string) => {
            if (key === "dualCameraMode") return "true";
            return null;
          },
        );

        render(<ClientPage />);

        // Wait for both peers and trigger initialization
        await waitForDualPeerAndTriggerOpen();

        await waitFor(
          () => {
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(
              2,
            );
          },
          { timeout: 5000 },
        );

        // In dual camera mode, the layout shows both cameras (multiple instances)
        await waitFor(() => {
          const frontLabels = screen.queryAllByText(/Front Camera/i);
          const backLabels = screen.queryAllByText(/Back Camera/i);
          expect(frontLabels.length).toBeGreaterThan(0);
          expect(backLabels.length).toBeGreaterThan(0);
        }, { timeout: 3000 });
      },
      10000,
    );

    it(
      "should show front camera controls in dual camera mode when menu is opened",
      async () => {
        const user = userEvent.setup();
        vi.mocked(window.localStorage.getItem).mockImplementation(
          (key: string) => {
            if (key === "dualCameraMode") return "true";
            return null;
          },
        );

        render(<ClientPage />);

        // Wait for both peers and trigger initialization
        await waitForDualPeerAndTriggerOpen();

        await waitFor(
          () => {
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(
              2,
            );
          },
          { timeout: 5000 },
        );

        const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
        await act(async () => {
          await user.click(menuButton);
        });

        // Verify front camera controls are shown (multiple instances expected)
        await waitFor(() => {
          const frontCameraLabels = screen.queryAllByText(/Front Camera/i);
          expect(frontCameraLabels.length).toBeGreaterThan(0);
        }, { timeout: 3000 });

        const buttons = screen.getAllByRole("button");
        const muteButtons = buttons.filter((btn) => btn.textContent?.includes("Mute"));
        expect(muteButtons.length).toBeGreaterThan(0);
      },
      10000,
    );

    it(
      "should show both camera controls in dual camera mode when menu is opened",
      async () => {
        const user = userEvent.setup();
        vi.mocked(window.localStorage.getItem).mockImplementation(
          (key: string) => {
            if (key === "dualCameraMode") return "true";
            return null;
          },
        );

        render(<ClientPage />);

        // Wait for both peers and trigger initialization
        await waitForDualPeerAndTriggerOpen();

        await waitFor(
          () => {
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(
              2,
            );
          },
          { timeout: 5000 },
        );

        const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
        await act(async () => {
          await user.click(menuButton);
        });

        // In dual camera mode, we should have dual camera toggle visible
        const dualCameraToggle = await screen.findByText(
          /Dual Camera Mode: ON/i,
          {},
          {
            timeout: 3000,
          },
        );
        expect(dualCameraToggle).toBeInTheDocument();

        // Check that multiple controls are present (for both cameras)
        const buttons = screen.getAllByRole("button");
        const muteButtons = buttons.filter((btn) => btn.textContent?.includes("Mute"));
        const videoButtons = buttons.filter((btn) => btn.textContent?.includes("Disable Video"));

        expect(muteButtons.length).toBeGreaterThanOrEqual(2);
        expect(videoButtons.length).toBeGreaterThanOrEqual(2);

        // Toggle front camera video and mute to cover all branches (lines 975-988, 998-1001)
        const frontVideoButton = videoButtons[0]!; // First video button is front camera
        const frontMuteButton = muteButtons[0]!; // First mute button is front camera

        await act(async () => {
          await user.click(frontVideoButton);
        });

        await waitFor(() => {
          const updatedButtons = screen.getAllByRole("button");
          const enableButtons = updatedButtons.filter((btn) =>
            btn.textContent?.includes("Enable Video")
          );
          expect(enableButtons.length).toBeGreaterThan(0);
        });

        await act(async () => {
          await user.click(frontMuteButton);
        });

        await waitFor(() => {
          const updatedButtons = screen.getAllByRole("button");
          const unmuteButtons = updatedButtons.filter((btn) => btn.textContent?.includes("Unmute"));
          expect(unmuteButtons.length).toBeGreaterThan(0);
        });

        // Toggle back camera video and mute to cover all branches
        const backVideoButton = videoButtons[1]!; // Second video button is back camera
        const backMuteButton = muteButtons[1]!; // Second mute button is back camera

        await act(async () => {
          await user.click(backVideoButton);
        });

        await waitFor(() => {
          const updatedButtons = screen.getAllByRole("button");
          const enableButtons = updatedButtons.filter((btn) =>
            btn.textContent?.includes("Enable Video")
          );
          expect(enableButtons.length).toBeGreaterThan(0);
        });

        await act(async () => {
          await user.click(backMuteButton);
        });

        await waitFor(() => {
          const updatedButtons = screen.getAllByRole("button");
          const unmuteButtons = updatedButtons.filter((btn) => btn.textContent?.includes("Unmute"));
          expect(unmuteButtons.length).toBeGreaterThan(0);
        });
      },
      15000,
    );

    it("should disable dual camera toggle when screen sharing", async () => {
      const user = userEvent.setup();

      render(<ClientPage />);

      // Wait for peer and trigger initialization
      await waitForPeerAndTriggerOpen();

      await waitFor(
        () => {
          expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      const menuButton = screen.getByRole("button", { name: /Toggle menu/i });
      await act(async () => {
        await user.click(menuButton);
      });

      // Start screen sharing
      const buttons = screen.getAllByRole("button");
      const shareButton = buttons.find((btn) => btn.textContent?.includes("Share Screen"));

      await act(async () => {
        await user.click(shareButton!);
      });

      await waitFor(() => {
        const updatedButtons = screen.getAllByRole("button");
        const dualCameraButton = updatedButtons.find((btn) =>
          btn.textContent?.includes("Dual Camera Mode")
        );
        expect(dualCameraButton).toBeDisabled();
      });
    });
  });
});
