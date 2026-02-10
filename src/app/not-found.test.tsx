import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotFound from "./not-found";

describe("NotFound (404 Page)", () => {
  const mockFetch = vi.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    delete (window as { location?: unknown; }).location;
    Object.defineProperty(window, "location", {
      value: { href: "", pathname: "/nonexistent-page" },
      writable: true,
      configurable: true,
    });
  });

  it("should render 404 card with title", () => {
    render(<NotFound />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The page you're looking for doesn't exist or has been moved.",
      ),
    ).toBeInTheDocument();
  });

  it("should display helpful message", () => {
    render(<NotFound />);

    expect(
      screen.getByText(
        "If you think this is a mistake, please let us know.",
      ),
    ).toBeInTheDocument();
  });

  it("should report 404 to error API on mount", () => {
    render(<NotFound />);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/errors/report",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const callBody = JSON.parse(
      mockFetch.mock.calls[0][1].body as string,
    );
    expect(callBody.errors).toHaveLength(1);
    expect(callBody.errors[0].errorType).toBe("NotFound");
    expect(callBody.errors[0].route).toBe("/nonexistent-page");
    expect(callBody.errors[0].environment).toBe("FRONTEND");
    expect(callBody.errors[0].message).toContain("404 Not Found");
  });

  it("should navigate to home when Go home button is clicked", async () => {
    const user = userEvent.setup();
    render(<NotFound />);

    const goHomeButton = screen.getByRole("button", { name: /go home/i });
    await user.click(goHomeButton);

    expect(window.location.href).toBe("/");
  });

  it("should navigate to my-apps when Back to My Apps button is clicked", async () => {
    const user = userEvent.setup();
    render(<NotFound />);

    const myAppsButton = screen.getByRole("button", {
      name: /back to my apps/i,
    });
    await user.click(myAppsButton);

    expect(window.location.href).toBe("/my-apps");
  });

  it("should have both action buttons", () => {
    render(<NotFound />);

    expect(screen.getByRole("button", { name: /go home/i }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to my apps/i }))
      .toBeInTheDocument();
  });

  it("should center content on screen", () => {
    const { container } = render(<NotFound />);

    const wrapper = container.querySelector(
      ".flex.min-h-screen.items-center.justify-center",
    );
    expect(wrapper).toBeInTheDocument();
  });

  it("should not crash if fetch fails", () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    expect(() => render(<NotFound />)).not.toThrow();
  });

  it("should report only once on mount", () => {
    render(<NotFound />);

    const reportCalls = mockFetch.mock.calls.filter(
      (call) => call[0] === "/api/errors/report",
    );
    expect(reportCalls).toHaveLength(1);
  });
});
