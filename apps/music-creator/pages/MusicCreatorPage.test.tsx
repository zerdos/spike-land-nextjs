import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import MusicCreatorPage from "./MusicCreatorPage";

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock Audio
class AudioMock {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  muted = false;
  volume = 1;
  currentTime = 0;
  src = "";

  constructor(src: string) {
    this.src = src;
  }
}
global.Audio = AudioMock as any;

describe("MusicCreatorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", () => {
    render(<MusicCreatorPage />);
    expect(screen.getByText("Music Creator")).toBeInTheDocument();
  });

  it("renders control buttons", () => {
    render(<MusicCreatorPage />);
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
    expect(screen.getByLabelText("Record")).toBeInTheDocument();
    expect(screen.getByText("Add Track")).toBeInTheDocument();
  });

  it("handles file upload", async () => {
    const user = userEvent.setup();
    const { container } = render(<MusicCreatorPage />);

    const file = new File(["audio content"], "test-audio.mp3", {
      type: "audio/mp3",
    });
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(await screen.findByText("test-audio.mp3")).toBeInTheDocument();
  });

  it("toggles play/stop", async () => {
    const user = userEvent.setup();
    render(<MusicCreatorPage />);

    const playButton = screen.getByLabelText("Play");
    await user.click(playButton);

    expect(await screen.findByLabelText("Stop")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Stop"));
    expect(await screen.findByLabelText("Play")).toBeInTheDocument();
  });
});
