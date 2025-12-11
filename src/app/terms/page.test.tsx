import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage from "./page";

describe("Terms of Service Page", () => {
  describe("Page Structure", () => {
    it("should render the page title", () => {
      render(<TermsPage />);
      expect(screen.getByRole("heading", { level: 1, name: /Terms of Service/i }))
        .toBeInTheDocument();
    });

    it("should display the last updated date", () => {
      const { container } = render(<TermsPage />);
      const dateText = container.querySelector("p");
      expect(dateText?.textContent).toMatch(/Last updated:/);
    });

    it("should display the legal disclaimer", () => {
      render(<TermsPage />);
      expect(screen.getByText(/This is a template for informational purposes/)).toBeInTheDocument();
    });

    it("should render the table of contents card", () => {
      render(<TermsPage />);
      expect(screen.getByText("Table of Contents")).toBeInTheDocument();
    });

    it("should have all major section headings", () => {
      const { container } = render(<TermsPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Acceptance of Terms")).toBe(true);
      expect(bodyText?.includes("Account Terms")).toBe(true);
      expect(bodyText?.includes("Token Economy")).toBe(true);
      expect(bodyText?.includes("Service Description")).toBe(true);
      expect(bodyText?.includes("Acceptable Use Policy")).toBe(true);
      expect(bodyText?.includes("Intellectual Property")).toBe(true);
      expect(bodyText?.includes("Payment Terms")).toBe(true);
      expect(bodyText?.includes("Limitation of Liability")).toBe(true);
      expect(bodyText?.includes("Dispute Resolution")).toBe(true);
      expect(bodyText?.includes("Changes to Terms")).toBe(true);
    });
  });

  describe("Acceptance of Terms Section", () => {
    it("should state terms agreement", () => {
      render(<TermsPage />);
      expect(screen.getByText(/By accessing and using the Pixel \(Spike Land\)/))
        .toBeInTheDocument();
    });

    it("should mention Terms of Service", () => {
      render(<TermsPage />);
      expect(screen.getByText(/these Terms of Service/)).toBeInTheDocument();
    });

    it("should specify age requirement", () => {
      render(<TermsPage />);
      expect(screen.getByText(/must be at least 13 years of age/)).toBeInTheDocument();
    });

    it("should state parental consent requirement", () => {
      render(<TermsPage />);
      expect(screen.getByText(/or have obtained parental consent/)).toBeInTheDocument();
    });

    it("should specify operator as company", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Spike Land Ltd")).toBe(true);
    });

    it("should mention capacity to agree", () => {
      render(<TermsPage />);
      expect(screen.getByText(/legal capacity to enter into these Terms/)).toBeInTheDocument();
    });

    it("should mention UK jurisdiction", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("laws of the United Kingdom")).toBe(true);
    });

    it("should mention consumer protection regulations", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("UK consumer protection regulations")).toBe(true);
    });
  });

  describe("Account Terms Section", () => {
    it("should explain account creation", () => {
      render(<TermsPage />);
      expect(screen.getByText(/OAuth authentication providers/)).toBeInTheDocument();
      expect(screen.getByText(/including GitHub and Google/)).toBeInTheDocument();
    });

    it("should explain account security responsibility", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("solely responsible for")).toBe(true);
      expect(
        container.textContent?.includes(
          "Maintaining the confidentiality of your OAuth credentials",
        ),
      ).toBe(true);
    });

    it("should forbid multiple accounts", () => {
      render(<TermsPage />);
      expect(screen.getByText(/may maintain only one personal account/)).toBeInTheDocument();
      expect(screen.getByText(/Creating multiple accounts to circumvent/)).toBeInTheDocument();
    });

    it("should explain account termination rights", () => {
      render(<TermsPage />);
      expect(screen.getByText(/reserve the right to terminate or suspend your account/))
        .toBeInTheDocument();
    });

    it("should list termination reasons", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Violation of these Terms/)).toBeInTheDocument();
      expect(screen.getByText(/Suspicious activity indicating fraud or misuse/))
        .toBeInTheDocument();
    });

    it("should explain account deletion process", () => {
      render(<TermsPage />);
      expect(screen.getByText(/may delete your account at any time/)).toBeInTheDocument();
      expect(screen.getByText(/account will be disabled immediately/)).toBeInTheDocument();
    });
  });

  describe("Token Economy Section", () => {
    it("should explain what tokens are", () => {
      render(<TermsPage />);
      expect(
        screen.getByText(/Tokens are the currency used to purchase image enhancement services/),
      ).toBeInTheDocument();
      expect(screen.getByText(/non-refundable and non-transferable digital units/))
        .toBeInTheDocument();
    });

    it("should explain free token generation", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("1 token per 15 minutes")).toBe(true);
      expect(container.textContent?.includes("Maximum Balance")).toBe(true);
      expect(container.textContent?.includes("100 tokens")).toBe(true);
    });

    it("should explain purchased tokens never expire", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Purchased tokens remain valid indefinitely/)).toBeInTheDocument();
      expect(screen.getByText(/do not expire/)).toBeInTheDocument();
    });

    it("should explain non-refundable policy", () => {
      render(<TermsPage />);
      expect(screen.getByText(/cannot be refunded.*except in cases of failed enhancements/))
        .toBeInTheDocument();
    });

    it("should explain non-transferable policy", () => {
      render(<TermsPage />);
      expect(screen.getByText(/cannot be transferred between accounts/)).toBeInTheDocument();
    });

    it("should mention token pricing flexibility", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Token prices are subject to change without notice/))
        .toBeInTheDocument();
    });

    it("should display token pricing table", () => {
      const { container } = render(<TermsPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Tokens")).toBe(true);
      expect(bodyText?.includes("Price (GBP)")).toBe(true);
      expect(bodyText?.includes("£1.99")).toBe(true);
    });

    it("should display token usage table", () => {
      const { container } = render(<TermsPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Enhancement Tier")).toBe(true);
      expect(bodyText?.includes("1K (1024x1024)")).toBe(true);
      expect(bodyText?.includes("2K (2048x2048)")).toBe(true);
      expect(bodyText?.includes("4K (4096x4096)")).toBe(true);
    });

    it("should specify token costs for each tier", () => {
      const { container } = render(<TermsPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("5 tokens")).toBe(true);
      expect(bodyText?.includes("10 tokens")).toBe(true);
      expect(bodyText?.includes("20 tokens")).toBe(true);
    });
  });

  describe("Service Description Section", () => {
    it("should describe service overview", () => {
      render(<TermsPage />);
      expect(screen.getByText(/AI-powered image processing service/)).toBeInTheDocument();
      expect(screen.getByText(/uses Google Gemini/)).toBeInTheDocument();
    });

    it("should explain 1K enhancement", () => {
      render(<TermsPage />);
      expect(screen.getByText(/1K Enhancement \(1024x1024\)/)).toBeInTheDocument();
      expect(screen.getByText(/Standard resolution enhancement suitable for web use/))
        .toBeInTheDocument();
    });

    it("should explain 2K enhancement", () => {
      render(<TermsPage />);
      expect(screen.getByText(/2K Enhancement \(2048x2048\)/)).toBeInTheDocument();
      expect(screen.getByText(/High-resolution enhancement suitable for printing/))
        .toBeInTheDocument();
    });

    it("should explain 4K enhancement", () => {
      render(<TermsPage />);
      expect(screen.getByText(/4K Enhancement \(4096x4096\)/)).toBeInTheDocument();
      expect(screen.getByText(/Ultra-high resolution enhancement/)).toBeInTheDocument();
    });

    it("should mention Google Gemini processing", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Image enhancements are processed using Google Gemini API/))
        .toBeInTheDocument();
      expect(screen.getByText(/you consent to this processing/)).toBeInTheDocument();
    });

    it("should disclaim warranty of specific results", () => {
      render(<TermsPage />);
      expect(screen.getByText(/No Guarantee of Specific Results/)).toBeInTheDocument();
      expect(screen.getByText(/without any warranty regarding the quality/)).toBeInTheDocument();
    });

    it("should explain service availability limitations", () => {
      render(<TermsPage />);
      expect(screen.getByText(/do not guarantee uninterrupted or error-free service/))
        .toBeInTheDocument();
      expect(screen.getByText(/Scheduled maintenance/)).toBeInTheDocument();
    });
  });

  describe("Acceptable Use Policy Section", () => {
    it("should list prohibited content", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Illegal content:/)).toBeInTheDocument();
      expect(screen.getByText(/Child exploitation:/)).toBeInTheDocument();
      expect(screen.getByText(/Malware or exploits:/)).toBeInTheDocument();
    });

    it("should mention CSAM prohibition", () => {
      render(<TermsPage />);
      expect(screen.getByText(/child sexual abuse material \(CSAM\)/)).toBeInTheDocument();
    });

    it("should mention copyright compliance", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Copyright Compliance/)).toBeInTheDocument();
      expect(screen.getByText(/own or have all necessary rights to use images/))
        .toBeInTheDocument();
    });

    it("should explain copyright infringement reporting", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("contact us at hello@spike.land")).toBe(true);
      expect(container.textContent?.includes("Identification of the infringing content")).toBe(
        true,
      );
    });

    it("should list misuse prevention measures", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Circumvent rate limits or token limits/)).toBeInTheDocument();
      expect(screen.getByText(/Attempt to gain unauthorized access/)).toBeInTheDocument();
    });

    it("should explain rate limiting enforcement", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Rate Limiting Enforcement/)).toBeInTheDocument();
      expect(screen.getByText(/20 image uploads per hour/)).toBeInTheDocument();
    });

    it("should list enforcement rights", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("reserve the right to")).toBe(true);
      expect(container.textContent?.includes("Immediately suspend or terminate your account")).toBe(
        true,
      );
    });
  });

  describe("Intellectual Property Section", () => {
    it("should state user retains image ownership", () => {
      render(<TermsPage />);
      expect(screen.getByText(/retain all intellectual property rights and ownership/))
        .toBeInTheDocument();
    });

    it("should explain platform license grant", () => {
      render(<TermsPage />);
      expect(screen.getByText(/limited, non-exclusive, revocable license/)).toBeInTheDocument();
      expect(screen.getByText(/Process and enhance your images/)).toBeInTheDocument();
    });

    it("should explicitly state no AI training", () => {
      render(<TermsPage />);
      expect(screen.getByText(/No AI Training/)).toBeInTheDocument();
      expect(screen.getByText(/explicitly guarantee that:/)).toBeInTheDocument();
      expect(screen.getByText(/NOT used to train AI models/)).toBeInTheDocument();
    });

    it("should forbid facial recognition training", () => {
      render(<TermsPage />);
      expect(screen.getByText(/NOT analyzed for facial recognition training/)).toBeInTheDocument();
    });

    it("should forbid commercial sharing", () => {
      render(<TermsPage />);
      expect(screen.getByText(/NOT sold or shared for commercial purposes/)).toBeInTheDocument();
    });

    it("should explain platform IP ownership", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Spike Land platform")).toBe(true);
      expect(container.textContent?.includes("owned by the Operator")).toBe(true);
    });

    it("should list platform IP types", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Software code and algorithms")).toBe(true);
      expect(container.textContent?.includes("User interface design")).toBe(true);
    });
  });

  describe("Payment Terms Section", () => {
    it("should specify GBP currency", () => {
      render(<TermsPage />);
      expect(screen.getByText(/British Pounds Sterling \(GBP\)/)).toBeInTheDocument();
    });

    it("should explain Stripe payment processing", () => {
      render(<TermsPage />);
      expect(screen.getByText(/processed through Stripe/)).toBeInTheDocument();
      expect(screen.getByText(/PCI DSS Level 1 compliant/)).toBeInTheDocument();
    });

    it("should clarify credit card handling", () => {
      render(<TermsPage />);
      expect(screen.getByText(/do not store your credit card information/)).toBeInTheDocument();
    });

    it("should explain automatic renewal", () => {
      render(<TermsPage />);
      expect(screen.getByText(/automatic token renewals/)).toBeInTheDocument();
      expect(screen.getByText(/You can cancel automatic renewals/)).toBeInTheDocument();
    });

    it("should explain general refund policy", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Token purchases are generally non-refundable/)).toBeInTheDocument();
    });

    it("should explain failed enhancement refund", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Failed Enhancement/)).toBeInTheDocument();
      expect(screen.getByText(/enhancement request fails due to a service error/))
        .toBeInTheDocument();
    });

    it("should explain billing error refund", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Billing Error/)).toBeInTheDocument();
      expect(screen.getByText(/charged twice or charged incorrectly/)).toBeInTheDocument();
    });

    it("should warn about chargeback consequences", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Payment Disputes/)).toBeInTheDocument();
      expect(screen.getByText(/dispute a charge with your card issuer/)).toBeInTheDocument();
    });

    it("should mention VAT", () => {
      render(<TermsPage />);
      expect(screen.getByText(/VAT \(Value Added Tax\)/)).toBeInTheDocument();
    });
  });

  describe("Limitation of Liability Section", () => {
    it("should state service provided as is", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Service is provided.*AS IS/)).toBeInTheDocument();
      expect(screen.getByText(/without warranties of any kind/)).toBeInTheDocument();
    });

    it("should disclaim warranty of results", () => {
      render(<TermsPage />);
      expect(screen.getByText(/No Warranty of Results/)).toBeInTheDocument();
      expect(screen.getByText(/do not warrant that:/)).toBeInTheDocument();
    });

    it("should list warranty disclaimers", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Image enhancements will meet your expectations/))
        .toBeInTheDocument();
      expect(screen.getByText(/will be error-free or uninterrupted/)).toBeInTheDocument();
    });

    it("should disclaim consequential damages", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Disclaimer of Consequential Damages/)).toBeInTheDocument();
      expect(screen.getByText(/Lost profits or revenue/)).toBeInTheDocument();
    });

    it("should specify maximum liability cap", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Maximum Liability/)).toBeInTheDocument();
      expect(screen.getByText(/not exceed the total amount you have paid/)).toBeInTheDocument();
    });

    it("should mention force majeure", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Force Majeure/)).toBeInTheDocument();
      expect(screen.getByText(/events beyond our reasonable control/)).toBeInTheDocument();
    });

    it("should list force majeure events", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Natural disasters, acts of God/)).toBeInTheDocument();
      expect(screen.getByText(/Pandemics or epidemics/)).toBeInTheDocument();
    });

    it("should explain indemnification", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Indemnification/)).toBeInTheDocument();
      expect(screen.getByText(/hold harmless the Operator/)).toBeInTheDocument();
    });

    it("should list indemnification trigger events", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Your use of the Service/)).toBeInTheDocument();
      expect(screen.getByText(/Your violation of these Terms/)).toBeInTheDocument();
    });
  });

  describe("Dispute Resolution Section", () => {
    it("should specify UK governing law", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("laws of the United Kingdom")).toBe(true);
    });

    it("should require informal resolution first", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Informal Resolution")).toBe(true);
      expect(
        container.textContent?.includes("attempt to resolve disputes through informal negotiation"),
      ).toBe(true);
    });

    it("should specify response time", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("will respond within 30 days")).toBe(true);
    });

    it("should specify jurisdiction and venue", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Jurisdiction and Venue")).toBe(true);
      expect(container.textContent?.includes("courts of England and Wales")).toBe(true);
    });

    it("should limit remedies", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Legal Remedies")).toBe(true);
      expect(container.textContent?.includes("sole and exclusive remedy")).toBe(true);
    });

    it("should explain severability", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Severability")).toBe(true);
      expect(container.textContent?.includes("remaining provisions shall remain in full force"))
        .toBe(true);
    });
  });

  describe("Changes to Terms Section", () => {
    it("should reserve right to modify terms", () => {
      render(<TermsPage />);
      expect(screen.getByText(/reserve the right to modify these Terms/)).toBeInTheDocument();
      expect(screen.getByText(/Changes are effective immediately/)).toBeInTheDocument();
    });

    it("should explain notice methods", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Notice of Changes/)).toBeInTheDocument();
      expect(screen.getByText(/Emailing you at your registered email address/)).toBeInTheDocument();
    });

    it("should mention last updated date tracking", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Updating the.*Last Updated.*date/)).toBeInTheDocument();
    });

    it("should explain acceptance by continued use", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Continued Use Constitutes Acceptance/)).toBeInTheDocument();
      expect(screen.getByText(/continued use of the Service after changes become effective/))
        .toBeInTheDocument();
    });

    it("should define material changes", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Material Changes/)).toBeInTheDocument();
      expect(screen.getByText(/Increase fees or token costs by more than 10%/)).toBeInTheDocument();
    });

    it("should specify material change notice period", () => {
      render(<TermsPage />);
      expect(screen.getByText(/at least 30 days notice/)).toBeInTheDocument();
    });
  });

  describe("Legal Disclaimer", () => {
    it("should display legal disclaimer", () => {
      render(<TermsPage />);
      expect(screen.getByText("Legal Disclaimer")).toBeInTheDocument();
    });

    it("should state this is a template", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("template for informational purposes only")).toBe(
        true,
      );
    });

    it("should recommend legal consultation", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("qualified attorney")).toBe(true);
      expect(container.textContent?.includes("technology law and consumer protection")).toBe(true);
    });

    it("should mention jurisdiction variations", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("customize them for your specific business model"))
        .toBe(true);
    });

    it("should warn against use without review", () => {
      const { container } = render(<TermsPage />);
      expect(
        container.textContent?.includes("should not be used without professional legal review"),
      ).toBe(true);
    });
  });

  describe("Navigation and Links", () => {
    it("should have table of contents links", () => {
      const { container } = render(<TermsPage />);
      const acceptanceLink = container.querySelector('a[href="#acceptance"]');
      expect(acceptanceLink).toBeInTheDocument();
    });

    it("should link to all major sections", () => {
      const { container } = render(<TermsPage />);
      expect(container.querySelector('a[href="#acceptance"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#account-terms"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#token-economy"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#service-description"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#acceptable-use"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#intellectual-property"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#payment-terms"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#limitation-liability"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#dispute-resolution"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#changes-terms"]')).toBeInTheDocument();
    });

    it("should have section IDs matching anchor links", () => {
      const { container } = render(<TermsPage />);
      const acceptanceSection = container.querySelector("#acceptance");
      expect(acceptanceSection).toBeInTheDocument();
      const textInSection = acceptanceSection?.textContent;
      expect(textInSection?.includes("Acceptance of Terms")).toBe(true);
    });

    it("should have email link for disputes", () => {
      render(<TermsPage />);
      const emailLinks = screen.getAllByText(/hello@spike\.land/);
      expect(emailLinks.length).toBeGreaterThan(0);
    });
  });

  describe("Compliance Coverage", () => {
    it("should cover UK law requirements", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("laws of the United Kingdom")).toBe(true);
      expect(container.textContent?.includes("UK consumer protection regulations")).toBe(true);
    });

    it("should cover age verification (13+)", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("at least 13 years of age")).toBe(true);
    });

    it("should cover CSAM prohibition", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("child sexual abuse material (CSAM)")).toBe(true);
    });

    it("should cover token refund policy", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("non-refundable")).toBe(true);
      expect(container.textContent?.includes("failed enhancements")).toBe(true);
    });

    it("should cover IP rights", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Intellectual Property")).toBe(true);
      expect(container.textContent?.includes("retain all intellectual property rights")).toBe(true);
    });

    it("should cover payment terms", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("British Pounds Sterling")).toBe(true);
      expect(container.textContent?.includes("Stripe")).toBe(true);
    });

    it("should cover limitation of liability", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Limitation of Liability")).toBe(true);
      expect(container.textContent?.includes("AS IS")).toBe(true);
    });

    it("should cover dispute resolution", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Dispute Resolution")).toBe(true);
      expect(container.textContent?.includes("courts of England and Wales")).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const { container } = render(<TermsPage />);
      const h1 = container.querySelectorAll("h1");
      expect(h1.length).toBeGreaterThan(0);
      const allHeadings = container.querySelectorAll("h1, h2, h3, h4");
      expect(allHeadings.length).toBeGreaterThan(10);
    });

    it("should have semantic structure", () => {
      const { container } = render(<TermsPage />);
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThan(0);
    });

    it("should have proper link attributes", () => {
      const { container } = render(<TermsPage />);
      const internalLinks = container.querySelectorAll('a[href^="#"]');
      expect(internalLinks.length).toBeGreaterThan(0);
      internalLinks.forEach((link) => {
        expect(link.getAttribute("href")).toBeTruthy();
      });
    });
  });

  describe("Content Completeness", () => {
    it("should cover all enhancement tiers", () => {
      const { container } = render(<TermsPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("1K (1024x1024)")).toBe(true);
      expect(bodyText?.includes("2K (2048x2048)")).toBe(true);
      expect(bodyText?.includes("4K (4096x4096)")).toBe(true);
    });

    it("should specify all token costs", () => {
      const { container } = render(<TermsPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("5 tokens")).toBe(true);
      expect(bodyText?.includes("10 tokens")).toBe(true);
      expect(bodyText?.includes("20 tokens")).toBe(true);
    });

    it("should mention Google Gemini", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Google Gemini")).toBe(true);
    });

    it("should mention Stripe", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Stripe")).toBe(true);
    });

    it("should cover acceptable use policies", () => {
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Acceptable Use Policy")).toBe(true);
      expect(container.textContent?.includes("Prohibited Content")).toBe(true);
    });

    it("should mention all prohibited content types", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Illegal content:/)).toBeInTheDocument();
      expect(screen.getByText(/Child exploitation:/)).toBeInTheDocument();
      expect(screen.getByText(/Malware or exploits:/)).toBeInTheDocument();
    });

    it("should specify rate limits", () => {
      render(<TermsPage />);
      expect(screen.getByText(/20 image uploads per hour/)).toBeInTheDocument();
      expect(screen.getByText(/100 API requests per minute/)).toBeInTheDocument();
    });
  });

  describe("Financial Terms Specifics", () => {
    it("should specify GBP currency", () => {
      const { container } = render(<TermsPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("GBP")).toBe(true);
      expect(bodyText?.includes("£")).toBe(true);
    });

    it("should show token pricing in GBP", () => {
      const { container } = render(<TermsPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("£1.99")).toBe(true);
      expect(bodyText?.includes("£8.99")).toBe(true);
      expect(bodyText?.includes("£15.99")).toBe(true);
    });

    it("should mention chargeback fees", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Demand repayment of any chargeback fees/)).toBeInTheDocument();
    });

    it("should explain VAT inclusion", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Prices displayed include VAT/)).toBeInTheDocument();
    });
  });

  describe("Token Policy Details", () => {
    it("should explain 15-minute regeneration rate", () => {
      render(<TermsPage />);
      expect(screen.getByText(/1 token per 15 minutes/)).toBeInTheDocument();
    });

    it("should explain 100 token maximum", () => {
      render(<TermsPage />);
      const { container } = render(<TermsPage />);
      expect(container.textContent?.includes("Maximum Balance")).toBe(true);
      expect(container.textContent?.includes("100 tokens")).toBe(true);
    });

    it("should explain token generation pause at max", () => {
      render(<TermsPage />);
      expect(screen.getByText(/token generation pauses until you use tokens/)).toBeInTheDocument();
    });

    it("should explain purchased tokens expiration policy", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Purchased tokens remain valid indefinitely/)).toBeInTheDocument();
    });

    it("should list failed enhancement refund conditions", () => {
      render(<TermsPage />);
      expect(
        screen.getByText(
          /tokens will be automatically credited back to your account within 24 hours/,
        ),
      ).toBeInTheDocument();
    });
  });
});
