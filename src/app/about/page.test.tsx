import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "./page";

describe("About Page", () => {
  it("renders the page title", () => {
    render(<AboutPage />);
    expect(screen.getByText("About Spike Land")).toBeInTheDocument();
  });

  it("renders the mission section", () => {
    render(<AboutPage />);
    expect(screen.getByText("Our Mission")).toBeInTheDocument();
    expect(screen.getByText(/democratize professional-grade marketing tools/)).toBeInTheDocument();
  });

  it("renders the founder story section", () => {
    render(<AboutPage />);
    expect(screen.getByText("The Founder's Story")).toBeInTheDocument();
  });

  it("renders the values section", () => {
    render(<AboutPage />);
    expect(screen.getByText("Our Core Values")).toBeInTheDocument();
    expect(screen.getByText("Innovation First")).toBeInTheDocument();
    expect(screen.getByText("User-Centricity")).toBeInTheDocument();
    expect(screen.getByText("Transparency")).toBeInTheDocument();
  });

  it("renders the timeline with key experiences", () => {
    render(<AboutPage />);
    expect(screen.getByText("Journey & Experience")).toBeInTheDocument();

    // Check for specific companies in the timeline
    // Using getAllByText because "Spike Land" is in the title too
    expect(screen.getAllByText("Spike Land").length).toBeGreaterThan(0);
    expect(screen.getByText("Virgin")).toBeInTheDocument();
    expect(screen.getByText("Investec")).toBeInTheDocument();
    expect(screen.getByText("TalkTalk")).toBeInTheDocument();
  });
});
