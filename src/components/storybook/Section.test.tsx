import { render, screen } from "@testing-library/react";
import { Section } from "./Section";
import { describe, it, expect } from "vitest";

describe("Section Component", () => {
  it("renders with title, description, and children", () => {
    render(
      <Section title="Test Title" description="Test Description">
        <div>Child Content</div>
      </Section>
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("renders without description", () => {
    render(
      <Section title="Test Title">
        <div>Child Content</div>
      </Section>
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.queryByText("Test Description")).not.toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("renders the title as a heading", () => {
    render(
      <Section title="Test Title">
        <div>Child Content</div>
      </Section>
    );

    expect(screen.getByRole("heading", { name: "Test Title" })).toBeInTheDocument();
  });
});
