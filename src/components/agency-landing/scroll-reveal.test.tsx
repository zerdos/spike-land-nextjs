import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./scroll-reveal";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      "data-testid": testId,
    }: {
      children: React.ReactNode;
      className?: string;
      "data-testid"?: string;
    }) => (
      <div className={className} data-testid={testId}>
        {children}
      </div>
    ),
  },
}));

describe("ScrollReveal", () => {
  it("renders children correctly", () => {
    render(
      <ScrollReveal>
        <p>Test content</p>
      </ScrollReveal>,
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <ScrollReveal className="custom-class">
        <p>Test content</p>
      </ScrollReveal>,
    );

    const content = screen.getByText("Test content");
    expect(content.parentElement).toHaveClass("custom-class");
  });

  it("renders with default fadeUp preset", () => {
    render(
      <ScrollReveal>
        <p>Default preset content</p>
      </ScrollReveal>,
    );

    expect(screen.getByText("Default preset content")).toBeInTheDocument();
  });

  it("renders with fadeIn preset", () => {
    render(
      <ScrollReveal preset="fadeIn">
        <p>FadeIn content</p>
      </ScrollReveal>,
    );

    expect(screen.getByText("FadeIn content")).toBeInTheDocument();
  });

  it("renders with slideLeft preset", () => {
    render(
      <ScrollReveal preset="slideLeft">
        <p>SlideLeft content</p>
      </ScrollReveal>,
    );

    expect(screen.getByText("SlideLeft content")).toBeInTheDocument();
  });

  it("renders with slideRight preset", () => {
    render(
      <ScrollReveal preset="slideRight">
        <p>SlideRight content</p>
      </ScrollReveal>,
    );

    expect(screen.getByText("SlideRight content")).toBeInTheDocument();
  });

  it("renders with scale preset", () => {
    render(
      <ScrollReveal preset="scale">
        <p>Scale content</p>
      </ScrollReveal>,
    );

    expect(screen.getByText("Scale content")).toBeInTheDocument();
  });
});

describe("StaggerContainer", () => {
  it("renders children correctly", () => {
    render(
      <StaggerContainer>
        <div>Child 1</div>
        <div>Child 2</div>
      </StaggerContainer>,
    );

    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <StaggerContainer className="stagger-class">
        <div>Test</div>
      </StaggerContainer>,
    );

    const content = screen.getByText("Test");
    expect(content.parentElement).toHaveClass("stagger-class");
  });
});

describe("StaggerItem", () => {
  it("renders children correctly", () => {
    render(
      <StaggerItem>
        <p>Stagger item content</p>
      </StaggerItem>,
    );

    expect(screen.getByText("Stagger item content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <StaggerItem className="item-class">
        <p>Test</p>
      </StaggerItem>,
    );

    const content = screen.getByText("Test");
    expect(content.parentElement).toHaveClass("item-class");
  });

  it("renders with custom preset", () => {
    render(
      <StaggerItem preset="scale">
        <p>Scale item</p>
      </StaggerItem>,
    );

    expect(screen.getByText("Scale item")).toBeInTheDocument();
  });
});
