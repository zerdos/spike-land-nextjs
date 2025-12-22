import { render, screen } from "@testing-library/react";
import { RequirementsManagerExample } from "./requirements-manager.example";
import { describe, it, expect } from "vitest";

describe("RequirementsManagerExample", () => {
  it("renders the example page", () => {
    render(<RequirementsManagerExample />);

    // Based on HTML dump
    expect(screen.getByRole("heading", { name: "My App Requirements" })).toBeInTheDocument();

    // "Requirements" header inside the card
    expect(screen.getByText("Requirements")).toBeInTheDocument();

    // Check for description text
    expect(screen.getByText("Manage app requirements with priorities and status tracking")).toBeInTheDocument();

    // Check for item
    expect(screen.getByText("User authentication with OAuth")).toBeInTheDocument();
  });
});
