import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChristmasBrightonPage from "./page";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("ChristmasBrightonPage", () => {
  it("renders the hero section with title", () => {
    render(<ChristmasBrightonPage />);

    expect(screen.getByTestId("hero-title")).toHaveTextContent(
      "Christmas in Brighton",
    );
  });

  it("displays all event cards", () => {
    render(<ChristmasBrightonPage />);

    expect(
      screen.getByTestId("event-card-brighton-christmas-market"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("event-card-santa's-grotto-experience"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("event-card-christmas-carol-concert"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("event-card-new-year's-eve-fireworks"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("event-card-ice-skating-rink")).toBeInTheDocument();
    expect(
      screen.getByTestId("event-card-christmas-lights-tour"),
    ).toBeInTheDocument();
  });

  it("displays featured events with special styling", () => {
    render(<ChristmasBrightonPage />);

    const marketCard = screen.getByTestId("event-card-brighton-christmas-market");
    const fireworksCard = screen.getByTestId(
      "event-card-new-year's-eve-fireworks",
    );

    expect(marketCard).toHaveClass("border-red-500");
    expect(fireworksCard).toHaveClass("border-red-500");
  });

  it("renders all book now buttons", () => {
    render(<ChristmasBrightonPage />);

    expect(
      screen.getByTestId("book-button-brighton-christmas-market"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("book-button-santa's-grotto-experience"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("book-button-christmas-carol-concert"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("book-button-new-year's-eve-fireworks"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("book-button-ice-skating-rink"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("book-button-christmas-lights-tour"),
    ).toBeInTheDocument();
  });

  it("displays special offers section", () => {
    render(<ChristmasBrightonPage />);

    expect(screen.getByText("Special Offers")).toBeInTheDocument();
    expect(screen.getByText("Early Bird Special")).toBeInTheDocument();
    expect(screen.getByText("Family Bundle")).toBeInTheDocument();
  });

  it("renders early bird offer details", () => {
    render(<ChristmasBrightonPage />);

    expect(screen.getByText("Book before December 10th")).toBeInTheDocument();
    expect(screen.getByText(/20% off/)).toBeInTheDocument();
    expect(screen.getByText("EARLYBIRD20")).toBeInTheDocument();
    expect(screen.getByTestId("claim-offer-early-bird")).toBeInTheDocument();
  });

  it("renders family bundle offer details", () => {
    render(<ChristmasBrightonPage />);

    expect(screen.getByText("Perfect for families")).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
    expect(screen.getByTestId("claim-offer-family-bundle")).toBeInTheDocument();
  });

  it("displays newsletter subscription form", () => {
    render(<ChristmasBrightonPage />);

    expect(screen.getByTestId("newsletter-form")).toBeInTheDocument();
    expect(screen.getByTestId("newsletter-input")).toBeInTheDocument();
    expect(screen.getByTestId("newsletter-submit")).toBeInTheDocument();
  });

  it("handles newsletter form submission", () => {
    render(<ChristmasBrightonPage />);

    const input = screen.getByTestId(
      "newsletter-input",
    ) as HTMLInputElement;
    const submitButton = screen.getByTestId("newsletter-submit");

    fireEvent.change(input, { target: { value: "test@example.com" } });
    expect(input.value).toBe("test@example.com");

    fireEvent.click(submitButton);

    expect(
      screen.getByText("Thank you for subscribing!"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Check your email for a special welcome offer."),
    ).toBeInTheDocument();
  });

  it("requires email input for newsletter submission", () => {
    render(<ChristmasBrightonPage />);

    const input = screen.getByTestId(
      "newsletter-input",
    ) as HTMLInputElement;
    expect(input).toHaveAttribute("required");
    expect(input).toHaveAttribute("type", "email");
  });

  it("displays footer CTA section", () => {
    render(<ChristmasBrightonPage />);

    expect(
      screen.getByText("Ready to Experience Christmas Magic?"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("cta-book-now")).toBeInTheDocument();
    expect(screen.getByTestId("cta-learn-more")).toBeInTheDocument();
  });

  it("renders CTA buttons with correct links", () => {
    render(<ChristmasBrightonPage />);

    const bookNowButton = screen.getByTestId("cta-book-now");
    const learnMoreButton = screen.getByTestId("cta-learn-more");

    expect(bookNowButton.closest("a")).toHaveAttribute("href", "/pricing");
    expect(learnMoreButton.closest("a")).toHaveAttribute("href", "/apps");
  });

  it("displays event pricing information", () => {
    render(<ChristmasBrightonPage />);

    expect(screen.getByText("Free Entry")).toBeInTheDocument();
    expect(screen.getByText("£15 per child")).toBeInTheDocument();
    expect(screen.getByText("£10 adults, £5 children")).toBeInTheDocument();
    expect(screen.getByText("Free to attend")).toBeInTheDocument();
    expect(screen.getByText("£12 adults, £8 children")).toBeInTheDocument();
    expect(screen.getByText("£8 per person")).toBeInTheDocument();
  });

  it("displays event dates and times", () => {
    render(<ChristmasBrightonPage />);

    expect(screen.getByText("Dec 1-24, 2025")).toBeInTheDocument();
    expect(screen.getByText("Dec 5-23, 2025")).toBeInTheDocument();
    expect(screen.getByText("Dec 18, 2025")).toBeInTheDocument();
    expect(screen.getByText("Dec 31, 2025")).toBeInTheDocument();
    expect(screen.getAllByText("Dec 1-31, 2025")).toHaveLength(2);
  });

  it("displays event locations", () => {
    render(<ChristmasBrightonPage />);

    expect(screen.getByText("Victoria Gardens")).toBeInTheDocument();
    expect(screen.getByText("Brighton Pavilion")).toBeInTheDocument();
    expect(screen.getByText("St. Peter's Church")).toBeInTheDocument();
    expect(screen.getByText("Brighton Beach")).toBeInTheDocument();
    expect(screen.getByText("Churchill Square")).toBeInTheDocument();
    expect(screen.getByText("City Centre")).toBeInTheDocument();
  });

  it("renders with proper accessibility attributes", () => {
    render(<ChristmasBrightonPage />);

    const newsletterInput = screen.getByTestId("newsletter-input");
    expect(newsletterInput).toHaveAttribute("placeholder", "Enter your email");

    const allButtons = screen.getAllByRole("button");
    expect(allButtons.length).toBeGreaterThan(0);
  });

  it("displays seasonal badges in hero section", () => {
    render(<ChristmasBrightonPage />);

    expect(screen.getByText("December 1st - 31st")).toBeInTheDocument();
    expect(screen.getByText("Brighton & Hove")).toBeInTheDocument();
  });

  it("shows privacy message in newsletter section", () => {
    render(<ChristmasBrightonPage />);

    expect(
      screen.getByText("We respect your privacy. Unsubscribe at any time."),
    ).toBeInTheDocument();
  });

  it("renders all festive icons", () => {
    const { container } = render(<ChristmasBrightonPage />);

    // Check that SVG icons are rendered (they should be in the document)
    const svgElements = container.querySelectorAll("svg");
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it("handles newsletter form submission with preventDefault", () => {
    render(<ChristmasBrightonPage />);

    const form = screen.getByTestId("newsletter-form");
    const preventDefaultSpy = vi.fn();

    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(submitEvent, "preventDefault", {
      value: preventDefaultSpy,
    });

    form.dispatchEvent(submitEvent);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("updates newsletter input value on change", () => {
    render(<ChristmasBrightonPage />);

    const input = screen.getByTestId(
      "newsletter-input",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "user@test.com" } });
    expect(input.value).toBe("user@test.com");

    fireEvent.change(input, { target: { value: "another@email.com" } });
    expect(input.value).toBe("another@email.com");
  });

  it("displays all event descriptions", () => {
    render(<ChristmasBrightonPage />);

    expect(
      screen.getByText(
        /Browse festive stalls featuring local crafts, gifts, and delicious seasonal treats/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Meet Santa in his magical grotto and receive a special gift/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Join us for a traditional carol service featuring local choirs/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Ring in the new year with spectacular fireworks over the sea/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Glide across the ice at Brighton's premier outdoor/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Guided walking tour of Brighton's stunning Christmas/),
    ).toBeInTheDocument();
  });
});
