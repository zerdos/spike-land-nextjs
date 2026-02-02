import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

// Mock next/cache
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

// Mock the orbit landing components
vi.mock("@/components/orbit-landing", () => ({
  ABTestingSection: () => <div data-testid="ab-testing-section">ABTestingSection</div>,
  AIAutomationSection: () => <div data-testid="ai-automation-section">AIAutomationSection</div>,
  BlogPreviewSection: () => <div data-testid="blog-preview-section">BlogPreviewSection</div>,
  EcosystemOverview: () => <div data-testid="ecosystem-overview">EcosystemOverview</div>,
  OrbitCTA: () => <div data-testid="orbit-cta">OrbitCTA</div>,
  OrbitHero: () => <div data-testid="orbit-hero">OrbitHero</div>,
  PlatformConnections: () => <div data-testid="platform-connections">PlatformConnections</div>,
}));

describe("Home Page", () => {
  it("should render all sections", () => {
    render(<Home />);

    expect(screen.getByTestId("orbit-hero")).toBeInTheDocument();
    expect(screen.getByTestId("platform-connections")).toBeInTheDocument();
    expect(screen.getByTestId("ai-automation-section")).toBeInTheDocument();
    expect(screen.getByTestId("ab-testing-section")).toBeInTheDocument();
    expect(screen.getByTestId("ecosystem-overview")).toBeInTheDocument();
    expect(screen.getByTestId("blog-preview-section")).toBeInTheDocument();
    expect(screen.getByTestId("orbit-cta")).toBeInTheDocument();
  });
});
