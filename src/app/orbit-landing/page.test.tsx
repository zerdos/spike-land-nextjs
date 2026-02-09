import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OrbitLandingPage, { metadata } from "./page";

// Mock all orbit-landing components
vi.mock("@/components/orbit-landing", () => ({
  OrbitHero: () => <div data-testid="orbit-hero">OrbitHero</div>,
  EcosystemOverview: () => <div data-testid="ecosystem-overview">EcosystemOverview</div>,
  PlatformConnections: () => <div data-testid="platform-connections">PlatformConnections</div>,
  AIAutomationSection: () => <div data-testid="ai-automation">AIAutomationSection</div>,
  ABTestingSection: () => <div data-testid="ab-testing">ABTestingSection</div>,
  BlogPreviewSection: () => <div data-testid="blog-preview">BlogPreviewSection</div>,
  OrbitCTA: () => <div data-testid="orbit-cta">OrbitCTA</div>,
}));

describe("OrbitLandingPage", () => {
  it("should render all sections", () => {
    render(<OrbitLandingPage />);

    expect(screen.getByTestId("orbit-hero")).toBeInTheDocument();
    expect(screen.getByTestId("ecosystem-overview")).toBeInTheDocument();
    expect(screen.getByTestId("platform-connections")).toBeInTheDocument();
    expect(screen.getByTestId("ai-automation")).toBeInTheDocument();
    expect(screen.getByTestId("ab-testing")).toBeInTheDocument();
    expect(screen.getByTestId("blog-preview")).toBeInTheDocument();
    expect(screen.getByTestId("orbit-cta")).toBeInTheDocument();
  });

  it("should render inside a main element", () => {
    const { container } = render(<OrbitLandingPage />);
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
  });

  it("should have correct metadata title", () => {
    expect(metadata.title).toBe(
      "Orbit - AI-Powered Social Media Command Center | Spike Land",
    );
  });

  it("should have correct metadata description", () => {
    expect(metadata.description).toContain("AI-powered social media command center");
  });

  it("should have OpenGraph metadata", () => {
    expect(metadata.openGraph).toBeDefined();
  });
});
