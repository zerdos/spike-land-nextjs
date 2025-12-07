import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./page";

describe("Privacy Policy Page", () => {
  describe("Page Structure", () => {
    it("should render the page title", () => {
      render(<PrivacyPage />);
      expect(screen.getByRole("heading", { level: 1, name: /Privacy Policy/i }))
        .toBeInTheDocument();
    });

    it("should display the last updated date", () => {
      const { container } = render(<PrivacyPage />);
      const dateText = container.querySelector("p");
      expect(dateText?.textContent).toMatch(/Last updated:/);
    });

    it("should display the legal disclaimer", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/This is a template for informational purposes/)).toBeInTheDocument();
    });

    it("should render the table of contents card", () => {
      render(<PrivacyPage />);
      expect(screen.getByText("Table of Contents")).toBeInTheDocument();
    });

    it("should have all major section headings", () => {
      const { container } = render(<PrivacyPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Introduction")).toBe(true);
      expect(bodyText?.includes("Data Collection")).toBe(true);
      expect(bodyText?.includes("Data Storage")).toBe(true);
      expect(bodyText?.includes("Privacy Rights")).toBe(true);
      expect(bodyText?.includes("Third-Party")).toBe(true);
      expect(bodyText?.includes("Security Measures")).toBe(true);
      expect(bodyText?.includes("Children")).toBe(true);
      expect(bodyText?.includes("Contact Us")).toBe(true);
    });
  });

  describe("Introduction Section", () => {
    it("should display operator name", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Operator:/)).toBeInTheDocument();
      expect(screen.getByText(/Zoltan Erdos/)).toBeInTheDocument();
    });

    it("should mention GDPR, UK GDPR and CCPA compliance", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/complies with GDPR/)).toBeInTheDocument();
      expect(screen.getAllByText(/UK GDPR/).length).toBeGreaterThan(0);
      const ccpaElements = screen.getAllByText(/CCPA/);
      expect(ccpaElements.length).toBeGreaterThan(0);
    });

    it("should list key policy topics", () => {
      const { container } = render(<PrivacyPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("What information we collect")).toBe(true);
      expect(bodyText?.includes("How we use your information")).toBe(true);
      expect(bodyText?.includes("Your rights and choices")).toBe(true);
      expect(bodyText?.includes("How we protect your data")).toBe(true);
    });
  });

  describe("Data Collection Section", () => {
    it("should explain account information collection", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Email, name, and profile image/)).toBeInTheDocument();
    });

    it("should mention OAuth providers", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/from OAuth providers like Google or GitHub/)).toBeInTheDocument();
    });

    it("should explain image collection", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Original and enhanced images uploaded for processing/))
        .toBeInTheDocument();
    });

    it("should explain payment processing", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/processed via Stripe/)).toBeInTheDocument();
    });

    it("should explain automatic data collection", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Usage Analytics/)).toBeInTheDocument();
      expect(screen.getByText(/Technical Data/)).toBeInTheDocument();
      expect(screen.getByText(/Session Data/)).toBeInTheDocument();
    });

    it("should list what is NOT collected", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Images are NOT used for AI model training/)).toBeInTheDocument();
      expect(screen.getByText(/No biometric or facial recognition data extracted/))
        .toBeInTheDocument();
      expect(screen.getByText(/No EXIF metadata retained from images/)).toBeInTheDocument();
    });

    it("should mention EXIF stripping", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/automatically stripped on upload/)).toBeInTheDocument();
    });
  });

  describe("Data Storage & Retention Section", () => {
    it("should display storage locations table", () => {
      const { container } = render(<PrivacyPage />);
      const tables = container.querySelectorAll("table");
      expect(tables.length).toBeGreaterThan(0);
      const bodyText = container.textContent;
      expect(bodyText?.includes("PostgreSQL (Neon)")).toBe(true);
      expect(bodyText?.includes("Cloudflare R2")).toBe(true);
      expect(bodyText?.includes("AES-256")).toBe(true);
    });

    it("should display retention periods table", () => {
      const { container } = render(<PrivacyPage />);
      const tables = container.querySelectorAll("table");
      expect(tables.length).toBeGreaterThan(1);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Retention Period")).toBe(true);
      expect(bodyText?.includes("Until deletion")).toBe(true);
    });

    it("should explain image cleanup process", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Images inactive for 90 days are automatically deleted/))
        .toBeInTheDocument();
      expect(screen.getByText(/Warning email sent/)).toBeInTheDocument();
    });

    it("should explain account deletion process", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Immediate \(within 24 hours\)/)).toBeInTheDocument();
      expect(screen.getByText(/Within 30 days/)).toBeInTheDocument();
      expect(screen.getByText(/Session tokens invalidated/)).toBeInTheDocument();
    });

    it("should mention transaction retention for legal reasons", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Transaction records retained \(legal requirement\)/))
        .toBeInTheDocument();
    });
  });

  describe("User Privacy Rights Section", () => {
    it("should list GDPR Article 15 right of access", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Right of Access/)).toBeInTheDocument();
      expect(screen.getByText(/can request a copy of all personal data/)).toBeInTheDocument();
    });

    it("should list GDPR Article 16 right to rectification", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Right to Rectification/)).toBeInTheDocument();
      expect(screen.getByText(/correction of inaccurate personal data/)).toBeInTheDocument();
    });

    it("should list GDPR Article 17 right to erasure", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Right to Erasure/)).toBeInTheDocument();
      expect(screen.getByText(/deletion of your personal data/)).toBeInTheDocument();
    });

    it("should list GDPR Article 18 right to restrict processing", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Right to Restrict Processing/)).toBeInTheDocument();
      expect(screen.getByText(/limit how we use your data/)).toBeInTheDocument();
    });

    it("should list GDPR Article 20 right to portability", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Right to Data Portability/)).toBeInTheDocument();
      expect(screen.getByText(/data in a portable format/)).toBeInTheDocument();
    });

    it("should list GDPR Article 21 right to object", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Right to Object/)).toBeInTheDocument();
      expect(screen.getByText(/object to processing of your data/)).toBeInTheDocument();
    });

    it("should provide privacy contact email", () => {
      render(<PrivacyPage />);
      const privacyEmails = screen.getAllByText(/privacy@\[your-domain\.com\]/);
      expect(privacyEmails.length).toBeGreaterThan(0);
    });

    it("should specify 30-day response time", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/will respond to your request within 30 days/)).toBeInTheDocument();
    });

    it("should explain CCPA rights", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/California Privacy Rights/)).toBeInTheDocument();
      expect(screen.getByText(/California residents have the right/)).toBeInTheDocument();
      expect(screen.getByText(/do not sell personal data/)).toBeInTheDocument();
    });

    it("should display response time table", () => {
      const { container } = render(<PrivacyPage />);
      const tables = container.querySelectorAll("table");
      expect(tables.length).toBeGreaterThan(2);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Response Times")).toBe(true);
      expect(bodyText?.includes("Data access")).toBe(true);
    });
  });

  describe("Third-Party Services Section", () => {
    it("should explain Google Gemini API usage", () => {
      render(<PrivacyPage />);
      expect(screen.getByText("Google Gemini API")).toBeInTheDocument();
      expect(screen.getByText(/AI image enhancement processing/)).toBeInTheDocument();
      expect(screen.getByText(/Image bytes only/)).toBeInTheDocument();
    });

    it("should mention user consent for Gemini", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/you consent to this processing/)).toBeInTheDocument();
    });

    it("should explain Stripe usage", () => {
      const { container } = render(<PrivacyPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Stripe (Payment Processing)")).toBe(true);
      expect(bodyText?.includes("Secure payment processing")).toBe(true);
      expect(bodyText?.includes("PCI DSS Level 1")).toBe(true);
    });

    it("should clarify credit card data handling", () => {
      const { container } = render(<PrivacyPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Not stored by us")).toBe(true);
      expect(bodyText?.includes("Stripe manages all payment data")).toBe(true);
    });

    it("should explain Cloudflare R2 storage", () => {
      const { container } = render(<PrivacyPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Cloudflare R2")).toBe(true);
      expect(bodyText?.includes("Secure image storage")).toBe(true);
      expect(bodyText?.includes("Edge network")).toBe(true);
      expect(bodyText?.includes("Signed URLs")).toBe(true);
    });

    it("should explain Neon database", () => {
      render(<PrivacyPage />);
      expect(screen.getByText("Neon PostgreSQL")).toBeInTheDocument();
      expect(screen.getByText(/User account and transaction database/)).toBeInTheDocument();
    });

    it("should mention Vercel hosting", () => {
      render(<PrivacyPage />);
      expect(screen.getByText("Vercel")).toBeInTheDocument();
      expect(screen.getByText(/Application hosting and deployment/)).toBeInTheDocument();
    });

    it("should explain DPA compliance", () => {
      const { container } = render(<PrivacyPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Data Processing Agreements")).toBe(true);
      expect(bodyText?.includes("Standard Contractual Clauses")).toBe(true);
      expect(bodyText?.includes("EU-US Data Privacy Framework")).toBe(true);
    });
  });

  describe("Security Measures Section", () => {
    it("should explain TLS encryption", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/TLS 1\.3/)).toBeInTheDocument();
      expect(screen.getByText(/All data in transit encrypted/)).toBeInTheDocument();
    });

    it("should explain AES-256 encryption", () => {
      render(<PrivacyPage />);
      const aesElements = screen.getAllByText(/AES-256/);
      expect(aesElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/All data at rest encrypted/)).toBeInTheDocument();
    });

    it("should explain OAuth authentication", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/OAuth 2\.0/)).toBeInTheDocument();
      expect(screen.getByText(/Secure authentication with providers/)).toBeInTheDocument();
    });

    it("should explain JWT token usage", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/JWT Tokens/)).toBeInTheDocument();
      expect(screen.getByText(/Signed and encrypted session tokens/)).toBeInTheDocument();
    });

    it("should mention rate limiting", () => {
      const { container } = render(<PrivacyPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Rate Limiting")).toBe(true);
      expect(bodyText?.includes("Protection against brute force")).toBe(true);
    });

    it("should mention file validation", () => {
      const { container } = render(<PrivacyPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("File Validation")).toBe(true);
      expect(bodyText?.includes("Type checking and size limits")).toBe(true);
    });

    it("should explain organizational security measures", () => {
      render(<PrivacyPage />);
      expect(screen.getByText("Organizational Security")).toBeInTheDocument();
      expect(screen.getByText(/Access control and role-based permissions/)).toBeInTheDocument();
      expect(screen.getByText(/Audit logging of all administrative actions/)).toBeInTheDocument();
      expect(screen.getByText(/72-hour data breach notification/)).toBeInTheDocument();
    });

    it("should display rate limiting policy table", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Login attempts/)).toBeInTheDocument();
      expect(screen.getByText(/5 attempts/)).toBeInTheDocument();
      expect(screen.getByText(/15 minutes/)).toBeInTheDocument();
      expect(screen.getByText(/Image uploads/)).toBeInTheDocument();
      expect(screen.getByText(/20 per user/)).toBeInTheDocument();
    });
  });

  describe("Children's Privacy Section", () => {
    it("should state age restriction", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/not intended for children under 13 years of age/))
        .toBeInTheDocument();
    });

    it("should state children data not collected knowingly", () => {
      render(<PrivacyPage />);
      expect(
        screen.getByText(/do not knowingly collect personal information from children under 13/),
      ).toBeInTheDocument();
    });

    it("should provide contact for child account deletion", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/If you believe a child under 13 has created an account/))
        .toBeInTheDocument();
      expect(screen.getByText(/delete the account within 30 days/)).toBeInTheDocument();
    });

    it("should require user age confirmation", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/you are at least 13 years old or have parental consent/))
        .toBeInTheDocument();
    });
  });

  describe("Contact Section", () => {
    it("should display privacy contact email link", () => {
      render(<PrivacyPage />);
      const emailLinks = screen.getAllByRole("link", { name: /privacy@\[your-domain\.com\]/ });
      expect(emailLinks.length).toBeGreaterThan(0);
    });

    it("should specify 72-hour response time", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Response time: 72 hours/)).toBeInTheDocument();
    });

    it("should mention GDPR Article 30 compliance", () => {
      render(<PrivacyPage />);
      expect(
        screen.getByText(/maintain records of our data processing activities per GDPR Article 30/),
      ).toBeInTheDocument();
    });

    it("should provide ICO link for UK complaints", () => {
      render(<PrivacyPage />);
      const icoLink = screen.getByRole("link", {
        name: /Information Commissioner's Office \(ICO\)/,
      });
      expect(icoLink).toHaveAttribute("href", "https://ico.org.uk");
    });

    it("should provide FTC link for US complaints", () => {
      render(<PrivacyPage />);
      const ftcLink = screen.getByRole("link", { name: /Federal Trade Commission \(FTC\)/ });
      expect(ftcLink).toHaveAttribute("href", "https://www.ftc.gov");
    });

    it("should mention EU local authorities", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Your local Data Protection Authority/)).toBeInTheDocument();
    });

    it("should explain policy update notification", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/may update this privacy policy/)).toBeInTheDocument();
      expect(screen.getByText(/notify you of material changes via email/)).toBeInTheDocument();
    });
  });

  describe("Legal Disclaimer", () => {
    it("should display legal disclaimer", () => {
      render(<PrivacyPage />);
      expect(screen.getByText("Legal Disclaimer")).toBeInTheDocument();
    });

    it("should state this is a template", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/template for informational purposes only/)).toBeInTheDocument();
    });

    it("should recommend legal consultation", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/consult with a qualified attorney/)).toBeInTheDocument();
    });

    it("should mention privacy laws complexity", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/privacy laws are complex and evolve frequently/))
        .toBeInTheDocument();
    });
  });

  describe("Navigation and Links", () => {
    it("should have table of contents links", () => {
      const { container } = render(<PrivacyPage />);
      const introLink = container.querySelector('a[href="#introduction"]');
      expect(introLink).toBeInTheDocument();
    });

    it("should link to all major sections", () => {
      const { container } = render(<PrivacyPage />);
      expect(container.querySelector('a[href="#introduction"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#data-collection"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#data-storage"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#user-rights"]')).toBeInTheDocument();
    });

    it("should have section IDs matching anchor links", () => {
      const { container } = render(<PrivacyPage />);
      const introSection = container.querySelector("#introduction");
      expect(introSection).toBeInTheDocument();
      const textInSection = introSection?.textContent;
      expect(textInSection?.includes("Introduction")).toBe(true);
    });
  });

  describe("Compliance Coverage", () => {
    it("should cover GDPR requirements", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Right of Access/)).toBeInTheDocument();
      expect(screen.getByText(/Right to Rectification/)).toBeInTheDocument();
      expect(screen.getByText(/Right to Erasure/)).toBeInTheDocument();
      expect(screen.getByText(/GDPR Article 30/)).toBeInTheDocument();
    });

    it("should cover UK GDPR requirements", () => {
      render(<PrivacyPage />);
      const ukGdprElements = screen.getAllByText(/UK GDPR/);
      expect(ukGdprElements.length).toBeGreaterThan(0);
    });

    it("should cover CCPA requirements", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/California Privacy Rights/)).toBeInTheDocument();
    });

    it("should cover data breach notification", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/72-hour data breach notification/)).toBeInTheDocument();
    });

    it("should cover DPA requirements", () => {
      render(<PrivacyPage />);
      const dpaElements = screen.getAllByText(/Data Processing Agreements/);
      expect(dpaElements.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const { container } = render(<PrivacyPage />);
      const h1 = container.querySelectorAll("h1");
      expect(h1.length).toBeGreaterThan(0);
      const allHeadings = container.querySelectorAll("h1, h2, h3, h4");
      expect(allHeadings.length).toBeGreaterThan(5);
    });

    it("should have semantic structure", () => {
      const { container } = render(<PrivacyPage />);
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThan(0);
    });

    it("should have proper link attributes", () => {
      const { container } = render(<PrivacyPage />);
      const externalLinks = container.querySelectorAll('a[href^="http"]');
      expect(externalLinks.length).toBeGreaterThan(0);
      externalLinks.forEach((link) => {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      });
    });
  });

  describe("Content Completeness", () => {
    it("should mention all major third-party services", () => {
      const { container } = render(<PrivacyPage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Google Gemini API")).toBe(true);
      expect(bodyText?.includes("Stripe (Payment Processing)")).toBe(true);
      expect(bodyText?.includes("Cloudflare R2")).toBe(true);
      expect(bodyText?.includes("Neon PostgreSQL")).toBe(true);
      expect(bodyText?.includes("Vercel")).toBe(true);
    });

    it("should specify all retention periods", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Until deletion/)).toBeInTheDocument();
      const ninetyDays = screen.getAllByText(/90 days/);
      expect(ninetyDays.length).toBeGreaterThan(0);
      expect(screen.getByText(/7 years/)).toBeInTheDocument();
      const thirtyDays = screen.getAllByText(/30 days/);
      expect(thirtyDays.length).toBeGreaterThan(0);
    });

    it("should cover all security measures", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/TLS 1\.3/)).toBeInTheDocument();
      const aesElements = screen.getAllByText(/AES-256/);
      expect(aesElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/OAuth 2\.0/)).toBeInTheDocument();
      expect(screen.getByText(/JWT Tokens/)).toBeInTheDocument();
    });
  });
});
