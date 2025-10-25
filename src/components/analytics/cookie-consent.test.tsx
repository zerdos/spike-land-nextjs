import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CookieConsent } from "./cookie-consent";

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should render the cookie consent banner when no consent is stored", () => {
    render(<CookieConsent />);
    expect(screen.getByText("Cookie Consent")).toBeInTheDocument();
    expect(
      screen.getByText(/We use cookies and analytics to improve your experience/i)
    ).toBeInTheDocument();
  });

  it("should not render when consent is already stored", () => {
    localStorage.setItem("cookie-consent", "accepted");
    render(<CookieConsent />);
    expect(screen.queryByText("Cookie Consent")).not.toBeInTheDocument();
  });

  it("should hide banner and store acceptance when Accept is clicked", () => {
    render(<CookieConsent />);
    const acceptButton = screen.getByRole("button", { name: /accept/i });
    fireEvent.click(acceptButton);

    expect(localStorage.getItem("cookie-consent")).toBe("accepted");
    expect(screen.queryByText("Cookie Consent")).not.toBeInTheDocument();
  });

  it("should hide banner and store decline when Decline is clicked", () => {
    render(<CookieConsent />);
    const declineButton = screen.getByRole("button", { name: /decline/i });
    fireEvent.click(declineButton);

    expect(localStorage.getItem("cookie-consent")).toBe("declined");
    expect(screen.queryByText("Cookie Consent")).not.toBeInTheDocument();
  });

  it("should render a link to the privacy page", () => {
    render(<CookieConsent />);
    const privacyLink = screen.getByRole("link", { name: /learn more/i });
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    expect(privacyLink).toHaveAttribute("target", "_blank");
    expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should have proper button variants", () => {
    render(<CookieConsent />);
    const acceptButton = screen.getByRole("button", { name: /accept/i });
    const declineButton = screen.getByRole("button", { name: /decline/i });

    expect(acceptButton).toBeInTheDocument();
    expect(declineButton).toBeInTheDocument();
  });

  it("should return null when banner is not shown", () => {
    localStorage.setItem("cookie-consent", "accepted");
    const { container } = render(<CookieConsent />);
    expect(container.firstChild).toBeNull();
  });
});
