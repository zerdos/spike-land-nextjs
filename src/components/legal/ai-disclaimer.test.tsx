import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AIDisclaimer } from "./ai-disclaimer";

describe("AIDisclaimer Component", () => {
  describe("Compact Variant", () => {
    it("should render compact variant by default", () => {
      render(<AIDisclaimer />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("AI-Powered Enhancement")).toBeInTheDocument();
    });

    it("should display brief description in collapsed state", () => {
      render(<AIDisclaimer />);
      expect(
        screen.getByText(/Images are processed by Google Gemini AI/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/EXIF metadata is stripped/i),
      ).toBeInTheDocument();
    });

    it("should show Learn more button when showLearnMore is true", () => {
      render(<AIDisclaimer showLearnMore />);
      expect(screen.getByRole("button", { name: /Learn more/i }))
        .toBeInTheDocument();
    });

    it("should not show Learn more button when showLearnMore is false", () => {
      render(<AIDisclaimer showLearnMore={false} />);
      expect(screen.queryByRole("button", { name: /Learn more/i }))
        .toBeInTheDocument();

      const links = screen.queryAllByRole("link");
      expect(links).toHaveLength(0);
    });

    it("should expand content when Learn more button is clicked", async () => {
      const user = userEvent.setup();
      render(<AIDisclaimer />);

      const button = screen.getByRole("button", { name: /Learn more/i });
      await user.click(button);

      expect(screen.getByText("AI Processing Notice")).toBeInTheDocument();
      expect(screen.getByText("Quality Disclaimer")).toBeInTheDocument();
      expect(screen.getByText("Data Handling")).toBeInTheDocument();
      expect(screen.getByText("Consent")).toBeInTheDocument();
    });

    it("should collapse content when Show less button is clicked", async () => {
      const user = userEvent.setup();
      render(<AIDisclaimer />);

      const learnMoreButton = screen.getByRole("button", {
        name: /Learn more/i,
      });
      await user.click(learnMoreButton);

      const showLessButton = screen.getByRole("button", { name: /Show less/i });
      await user.click(showLessButton);

      expect(screen.queryByText("AI Processing Notice")).not
        .toBeInTheDocument();
    });

    it("should display Privacy Policy link when expanded", async () => {
      const user = userEvent.setup();
      render(<AIDisclaimer />);

      await user.click(screen.getByRole("button", { name: /Learn more/i }));

      const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i });
      expect(privacyLink).toHaveAttribute("href", "/privacy");
      expect(privacyLink).toHaveAttribute("target", "_blank");
      expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should display Google AI Principles link when expanded", async () => {
      const user = userEvent.setup();
      render(<AIDisclaimer />);

      await user.click(screen.getByRole("button", { name: /Learn more/i }));

      const googleLink = screen.getByRole("link", {
        name: /Google AI Principles/i,
      });
      expect(googleLink).toHaveAttribute(
        "href",
        "https://ai.google/responsibility/principles/",
      );
      expect(googleLink).toHaveAttribute("target", "_blank");
      expect(googleLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should not show links when expanded if showLearnMore is false", async () => {
      const user = userEvent.setup();
      render(<AIDisclaimer showLearnMore={false} />);

      await user.click(screen.getByRole("button", { name: /Learn more/i }));

      expect(screen.queryByRole("link", { name: /Privacy Policy/i })).not
        .toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Google AI Principles/i })).not
        .toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<AIDisclaimer className="custom-class" />);
      const alert = document.querySelector(".custom-class");
      expect(alert).toBeInTheDocument();
    });

    it("should display all sections when expanded", async () => {
      const user = userEvent.setup();
      render(<AIDisclaimer />);

      await user.click(screen.getByRole("button", { name: /Learn more/i }));

      expect(
        screen.getAllByText(/Images are processed by Google Gemini AI/i).length,
      )
        .toBeGreaterThan(0);
      expect(screen.getByText(/Processing happens on Google's servers/i))
        .toBeInTheDocument();
      expect(screen.getByText(/AI enhancement results vary/i))
        .toBeInTheDocument();
      expect(screen.getAllByText(/Images are NOT used for AI training/i).length)
        .toBeGreaterThan(0);
      expect(screen.getByText(/By using enhancement, you consent/i))
        .toBeInTheDocument();
    });

    it("should show Info icon", () => {
      render(<AIDisclaimer />);
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should show ChevronDown icon when collapsed", () => {
      render(<AIDisclaimer />);
      const button = screen.getByRole("button", { name: /Learn more/i });
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should show ChevronUp icon when expanded", async () => {
      const user = userEvent.setup();
      render(<AIDisclaimer />);

      await user.click(screen.getByRole("button", { name: /Learn more/i }));

      const button = screen.getByRole("button", { name: /Show less/i });
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Full Variant", () => {
    it("should render full variant", () => {
      render(<AIDisclaimer variant="full" />);
      expect(screen.getByText("AI Enhancement Disclaimer")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Important information about AI-powered image processing/i,
        ),
      ).toBeInTheDocument();
    });

    it("should display all sections immediately", () => {
      render(<AIDisclaimer variant="full" />);

      expect(screen.getByText("AI Processing Notice")).toBeInTheDocument();
      expect(screen.getByText("Quality Disclaimer")).toBeInTheDocument();
      expect(screen.getByText("Data Handling")).toBeInTheDocument();
      expect(screen.getByText("Consent")).toBeInTheDocument();
    });

    it("should display AI Processing Notice details", () => {
      render(<AIDisclaimer variant="full" />);

      expect(screen.getByText(/Images are processed by Google Gemini AI/i))
        .toBeInTheDocument();
      expect(screen.getByText(/Processing happens on Google's servers/i))
        .toBeInTheDocument();
      expect(
        screen.getByText(/Images are sent to Google for enhancement/i),
      ).toBeInTheDocument();
    });

    it("should display Quality Disclaimer details", () => {
      render(<AIDisclaimer variant="full" />);

      expect(screen.getByText(/AI enhancement results vary/i))
        .toBeInTheDocument();
      expect(screen.getByText(/No guarantee of specific outcomes/i))
        .toBeInTheDocument();
      expect(screen.getByText(/Results depend on input image quality/i))
        .toBeInTheDocument();
    });

    it("should display Data Handling details", () => {
      render(<AIDisclaimer variant="full" />);

      expect(screen.getAllByText(/Images are NOT used for AI training/i).length)
        .toBeGreaterThan(0);
      expect(screen.getAllByText(/EXIF metadata is stripped/i).length)
        .toBeGreaterThan(0);
      expect(screen.getByText(/Images are stored temporarily/i))
        .toBeInTheDocument();
    });

    it("should display Consent details", () => {
      render(<AIDisclaimer variant="full" />);

      expect(
        screen.getByText(/By using the AI enhancement feature, you consent/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/sending your images to Google's AI services/i),
      ).toBeInTheDocument();
    });

    it("should display Privacy Policy link when showLearnMore is true", () => {
      render(<AIDisclaimer variant="full" showLearnMore />);

      const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i });
      expect(privacyLink).toHaveAttribute("href", "/privacy");
      expect(privacyLink).toHaveAttribute("target", "_blank");
      expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should display Google AI Principles link when showLearnMore is true", () => {
      render(<AIDisclaimer variant="full" showLearnMore />);

      const googleLink = screen.getByRole("link", {
        name: /Google AI Principles/i,
      });
      expect(googleLink).toHaveAttribute(
        "href",
        "https://ai.google/responsibility/principles/",
      );
      expect(googleLink).toHaveAttribute("target", "_blank");
      expect(googleLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should not display links when showLearnMore is false", () => {
      render(<AIDisclaimer variant="full" showLearnMore={false} />);

      expect(screen.queryByRole("link", { name: /Privacy Policy/i })).not
        .toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Google AI Principles/i })).not
        .toBeInTheDocument();
      expect(screen.queryByText(/For more information:/i)).not
        .toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <AIDisclaimer variant="full" className="custom-class" />,
      );
      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });

    it("should not have Learn more button in full variant", () => {
      render(<AIDisclaimer variant="full" />);
      expect(screen.queryByRole("button", { name: /Learn more/i })).not
        .toBeInTheDocument();
    });

    it("should show Info icon", () => {
      const { container } = render(<AIDisclaimer variant="full" />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should display For more information section when showLearnMore is true", () => {
      render(<AIDisclaimer variant="full" showLearnMore />);
      expect(screen.getByText(/For more information:/i)).toBeInTheDocument();
    });
  });

  describe("Props", () => {
    it("should default to compact variant", () => {
      render(<AIDisclaimer />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should default showLearnMore to true", () => {
      render(<AIDisclaimer />);
      expect(screen.getByRole("button", { name: /Learn more/i }))
        .toBeInTheDocument();
    });

    it("should accept variant prop", () => {
      const { rerender } = render(<AIDisclaimer variant="compact" />);
      expect(screen.getByRole("alert")).toBeInTheDocument();

      rerender(<AIDisclaimer variant="full" />);
      expect(screen.getByText("AI Enhancement Disclaimer")).toBeInTheDocument();
    });

    it("should accept showLearnMore prop", () => {
      const { rerender } = render(<AIDisclaimer showLearnMore />);
      expect(screen.getByRole("button", { name: /Learn more/i }))
        .toBeInTheDocument();

      rerender(<AIDisclaimer showLearnMore={false} />);
      const button = screen.getByRole("button", { name: /Learn more/i });
      expect(button).toBeInTheDocument();
    });

    it("should accept className prop", () => {
      const { container } = render(<AIDisclaimer className="test-class" />);
      const element = container.querySelector(".test-class");
      expect(element).toBeInTheDocument();
    });
  });

  describe("Display Name", () => {
    it("should have correct display name", () => {
      expect(AIDisclaimer.displayName).toBe("AIDisclaimer");
    });
  });

  describe("Accessibility", () => {
    it("should have alert role for compact variant", () => {
      render(<AIDisclaimer variant="compact" />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should have accessible button text", () => {
      render(<AIDisclaimer />);
      const button = screen.getByRole("button", { name: /Learn more/i });
      expect(button).toHaveAccessibleName();
    });

    it("should have accessible links with proper attributes", async () => {
      const user = userEvent.setup();
      render(<AIDisclaimer />);

      await user.click(screen.getByRole("button", { name: /Learn more/i }));

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });

  describe("Toggle Behavior", () => {
    it("should start collapsed", () => {
      render(<AIDisclaimer />);
      expect(screen.queryByText("AI Processing Notice")).not
        .toBeInTheDocument();
    });

    it("should toggle between collapsed and expanded states", async () => {
      const user = userEvent.setup();
      render(<AIDisclaimer />);

      expect(screen.queryByText("AI Processing Notice")).not
        .toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Learn more/i }));
      expect(screen.getByText("AI Processing Notice")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Show less/i }));
      expect(screen.queryByText("AI Processing Notice")).not
        .toBeInTheDocument();
    });

    it("should maintain expanded state across re-renders", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<AIDisclaimer />);

      await user.click(screen.getByRole("button", { name: /Learn more/i }));
      expect(screen.getByText("AI Processing Notice")).toBeInTheDocument();

      rerender(<AIDisclaimer className="updated" />);
      expect(screen.getByText("AI Processing Notice")).toBeInTheDocument();
    });
  });
});
