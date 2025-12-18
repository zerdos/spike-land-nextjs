/**
 * Audio Mixer Page Tests
 * Resolves #332
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AudioMixerPage from "./page";

// Mock the AudioMixer component
vi.mock("@apps/audio-mixer/components", () => ({
  AudioMixer: () => <div data-testid="audio-mixer">Audio Mixer Component</div>,
}));

describe("AudioMixerPage", () => {
  it("renders AudioMixer component", () => {
    render(<AudioMixerPage />);

    expect(screen.getByTestId("audio-mixer")).toBeInTheDocument();
    expect(screen.getByText("Audio Mixer Component")).toBeInTheDocument();
  });
});
