import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ErrorsPage from "./page";

// Mock the ErrorBoundary to simplify testing (avoiding real error throwing in tests)
// But we can also test the interaction if we want.
// For this visual test, ensuring it renders is key.
// However, since the ErrorBoundary catches errors, we might want to mock console.error to avoid noise.

describe("ErrorsPage", () => {
  it("renders the errors page correctly", () => {
    render(<ErrorsPage />);

    // Check for section title and description
    expect(screen.getByText("Error Handling")).toBeDefined();
    expect(
      screen.getByText("Components for handling and displaying errors"),
    ).toBeDefined();

    // Check for component card
    expect(screen.getByText("Error Boundary")).toBeDefined();

    // Check for instruction text
    expect(screen.getByText(/Click the button below to crash this part of the UI/i)).toBeDefined();

    // Check for trigger button
    expect(screen.getByRole("button", { name: "Trigger Error" })).toBeDefined();
  });
});
