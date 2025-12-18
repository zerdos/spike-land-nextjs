/**
 * Audio Mixer Layout Tests
 * Resolves #332
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AudioMixerLayout from "./layout";

describe("AudioMixerLayout", () => {
  it("renders children", () => {
    render(
      <AudioMixerLayout>
        <div data-testid="child">Child Content</div>
      </AudioMixerLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });
});
