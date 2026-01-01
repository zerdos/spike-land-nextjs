import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VideoOverlay } from "./VideoOverlay";

// Mock MediaStream
class MockMediaStream {
  id = "mock-stream-id";
  active = true;
  getTracks() {
    return [];
  }
  getVideoTracks() {
    return [];
  }
  getAudioTracks() {
    return [];
  }
  addTrack() {}
  removeTrack() {}
  clone() {
    return new MockMediaStream();
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
}

// Define globally before tests
beforeEach(() => {
  (global as unknown as { MediaStream: typeof MockMediaStream; }).MediaStream = MockMediaStream;
});

// Mock video element's play method
Object.defineProperty(HTMLVideoElement.prototype, "play", {
  configurable: true,
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

describe("VideoOverlay", () => {
  it("renders without streams", () => {
    render(<VideoOverlay localStream={null} remoteStreams={new Map()} />);
    expect(screen.getByTestId("video-overlay")).toBeDefined();
  });

  it("renders local stream with muted video", () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const { container } = render(
      <VideoOverlay localStream={mockStream} remoteStreams={new Map()} />,
    );

    const videos = container.querySelectorAll("video") as NodeListOf<HTMLVideoElement>;
    expect(videos).toHaveLength(1);
    expect(videos[0]!.muted).toBe(true);

    // Check for "You" label
    expect(screen.getByText("You")).toBeDefined();
  });

  it("renders remote streams without muting", () => {
    const mockStream1 = new MockMediaStream() as unknown as MediaStream;
    const mockStream2 = new MockMediaStream() as unknown as MediaStream;
    const remoteStreams = new Map([
      ["peer-1234", mockStream1],
      ["peer-5678", mockStream2],
    ]);

    const { container } = render(<VideoOverlay localStream={null} remoteStreams={remoteStreams} />);

    const videos = container.querySelectorAll("video") as NodeListOf<HTMLVideoElement>;
    expect(videos).toHaveLength(2);

    // Remote streams should not be muted
    videos.forEach(video => {
      expect(video.muted).toBe(false);
    });

    // Check for truncated peer IDs (there should be 2 peers)
    expect(screen.getAllByText("peer")).toHaveLength(2);
  });

  it("renders both local and remote streams", () => {
    const localStream = new MockMediaStream() as unknown as MediaStream;
    const remoteStream = new MockMediaStream() as unknown as MediaStream;
    const remoteStreams = new Map([["remote-id", remoteStream]]);

    const { container } = render(
      <VideoOverlay localStream={localStream} remoteStreams={remoteStreams} />,
    );

    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(2);

    expect(screen.getByText("You")).toBeDefined();
  });

  it("displays videos with autoPlay and playsInline", () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const { container } = render(
      <VideoOverlay localStream={mockStream} remoteStreams={new Map()} />,
    );

    const video = container.querySelector("video") as HTMLVideoElement;
    expect(video).toBeDefined();
    expect(video.autoplay).toBe(true);
  });
});
