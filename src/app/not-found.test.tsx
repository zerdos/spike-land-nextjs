import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotFound from "./not-found";

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn().mockReturnValue(true);
Object.defineProperty(navigator, "sendBeacon", {
  value: mockSendBeacon,
  writable: true,
  configurable: true,
});

describe("NotFound (404 Page)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as { location?: unknown }).location;
    Object.defineProperty(window, "location", {
      value: { href: "", pathname: "/nonexistent-page" },
      writable: true,
      configurable: true,
    });
  });

  it("should render 404 card with message", () => {
    render(<NotFound />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The page you're looking for doesn't exist or has been moved.",
      ),
    ).toBeInTheDocument();
  });

  it("should render support message", () => {
    render(<NotFound />);

    expect(
      screen.getByText(
        "If you believe this is an error, please contact support.",
      ),
    ).toBeInTheDocument();
  });

  it("should navigate to home when Go home button is clicked", async () => {
    const user = userEvent.setup();
    render(<NotFound />);

    const goHomeButton = screen.getByRole("button", { name: /go home/i });
    await user.click(goHomeButton);

    expect(window.location.href).toBe("/");
  });

  it("should navigate to My Apps when Back to My Apps button is clicked", async () => {
    const user = userEvent.setup();
    render(<NotFound />);

    const myAppsButton = screen.getByRole("button", {
      name: /back to my apps/i,
    });
    await user.click(myAppsButton);

    expect(window.location.href).toBe("/my-apps");
  });

  it("should report 404 on mount via sendBeacon", () => {
    render(<NotFound />);

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    expect(mockSendBeacon).toHaveBeenCalledWith(
      "/api/errors/report",
      expect.any(Blob),
    );
  });

  it("should include correct error data in report", () => {
    render(<NotFound />);

    const blobArg = mockSendBeacon.mock.calls[0][1] as Blob;
    expect(blobArg.type).toBe("application/json");
  });

  it("should render buttons in footer", () => {
    render(<NotFound />);

    const goHomeButton = screen.getByRole("button", { name: /go home/i });
    const myAppsButton = screen.getByRole("button", {
      name: /back to my apps/i,
    });

    expect(goHomeButton).toBeInTheDocument();
    expect(myAppsButton).toBeInTheDocument();
  });

  it("should center content on screen", () => {
    const { container } = render(<NotFound />);

    const wrapper = container.querySelector(
      ".flex.min-h-screen.items-center.justify-center",
    );
    expect(wrapper).toBeInTheDocument();
  });

  it("should not throw if sendBeacon fails", () => {
    mockSendBeacon.mockImplementation(() => {
      throw new Error("sendBeacon failed");
    });

    expect(() => render(<NotFound />)).not.toThrow();
  });
});
