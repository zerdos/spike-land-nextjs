/**
 * Tests for Gallery Admin Page Component
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GalleryAdminPage from "./page";

// Mock the GalleryAdminClient component
vi.mock("./GalleryAdminClient", () => ({
  GalleryAdminClient: () => <div data-testid="gallery-admin-client">GalleryAdminClient</div>,
}));

describe("GalleryAdminPage", () => {
  it("should render the page title", () => {
    render(<GalleryAdminPage />);

    expect(screen.getByText("Featured Gallery")).toBeInTheDocument();
  });

  it("should render the page description", () => {
    render(<GalleryAdminPage />);

    expect(
      screen.getByText("Manage before/after image pairs displayed on the landing page."),
    ).toBeInTheDocument();
  });

  it("should render GalleryAdminClient component", () => {
    render(<GalleryAdminPage />);

    expect(screen.getByTestId("gallery-admin-client")).toBeInTheDocument();
  });
});
