import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CookiePage from "./page";

describe("Cookie Policy Page", () => {
  describe("Page Structure", () => {
    it("should render the page title", () => {
      render(<CookiePage />);
      expect(screen.getByRole("heading", { level: 1, name: /Cookie Policy/i }))
        .toBeInTheDocument();
    });

    it("should display the last updated date", () => {
      const { container } = render(<CookiePage />);
      const dateText = container.querySelector("p");
      expect(dateText?.textContent).toMatch(/Last updated:/);
    });

    it("should display the legal disclaimer", () => {
      render(<CookiePage />);
      expect(screen.getByText(/This is a template for informational purposes/))
        .toBeInTheDocument();
    });

    it("should render the table of contents card", () => {
      render(<CookiePage />);
      expect(screen.getByText("Table of Contents")).toBeInTheDocument();
    });

    it("should have all major section headings", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("What Are Cookies")).toBe(true);
      expect(bodyText?.includes("Cookies We Use")).toBe(true);
      expect(bodyText?.includes("Essential Cookies")).toBe(true);
      expect(bodyText?.includes("Analytics Cookies")).toBe(true);
      expect(bodyText?.includes("Third-Party Cookies")).toBe(true);
      expect(bodyText?.includes("Managing Cookies")).toBe(true);
      expect(bodyText?.includes("Cookie Consent")).toBe(true);
      expect(bodyText?.includes("Policy Updates")).toBe(true);
      expect(bodyText?.includes("Contact Us")).toBe(true);
    });
  });

  describe("What Are Cookies Section", () => {
    it("should explain what cookies are", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(/small text files that are stored on your device/),
      )
        .toBeInTheDocument();
    });

    it("should explain how cookies work", () => {
      render(<CookiePage />);
      expect(screen.getByText(/You visit the Pixel \(Spike Land\)/))
        .toBeInTheDocument();
      expect(
        screen.getByText(
          /When you return to the website, your browser sends the cookie back/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should define session cookies", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /Temporary cookies that are deleted when you close your browser/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should define persistent cookies", () => {
      render(<CookiePage />);
      expect(screen.getByText(/remain on your device for a set period/))
        .toBeInTheDocument();
    });

    it("should define first-party cookies", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Set by the website you are visiting \(Pixel\)/))
        .toBeInTheDocument();
    });

    it("should define third-party cookies", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /Set by other websites or services embedded in our site/,
        ),
      )
        .toBeInTheDocument();
    });
  });

  describe("Cookies We Use Section", () => {
    it("should display cookie summary table", () => {
      const { container } = render(<CookiePage />);
      const tables = container.querySelectorAll("table");
      expect(tables.length).toBeGreaterThan(0);
    });

    it("should list authjs.session-token cookie", () => {
      render(<CookiePage />);
      const bodyText = screen.getByText(/User authentication session/);
      expect(bodyText).toBeInTheDocument();
    });

    it("should list secure session token cookie", () => {
      render(<CookiePage />);
      const bodyText = screen.getByText(/Secure session token \(HTTPS\)/);
      expect(bodyText).toBeInTheDocument();
    });

    it("should list CSRF token cookie", () => {
      render(<CookiePage />);
      const bodyText = screen.getByText(/CSRF protection/);
      expect(bodyText).toBeInTheDocument();
    });

    it("should list OAuth callback cookie", () => {
      render(<CookiePage />);
      const bodyText = screen.getByText(/OAuth callback redirect/);
      expect(bodyText).toBeInTheDocument();
    });

    it("should list Vercel insights cookie", () => {
      render(<CookiePage />);
      const bodyText = screen.getByText(/Vercel performance insights/);
      expect(bodyText).toBeInTheDocument();
    });

    it("should list Stripe cookie", () => {
      render(<CookiePage />);
      const bodyText = screen.getByText(/Stripe payment processing/);
      expect(bodyText).toBeInTheDocument();
    });

    it("should list Google Analytics cookie", () => {
      render(<CookiePage />);
      const bodyText = screen.getByText(/Google Analytics tracking/);
      expect(bodyText).toBeInTheDocument();
    });

    it("should list OAuth nonce cookie", () => {
      render(<CookiePage />);
      const bodyText = screen.getByText(/OAuth security nonce/);
      expect(bodyText).toBeInTheDocument();
    });

    it("should include table note", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Cookie names and durations may vary/))
        .toBeInTheDocument();
    });
  });

  describe("Essential Cookies Section", () => {
    it("should explain why essential cookies are needed", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Keeping you logged into your account/))
        .toBeInTheDocument();
      expect(screen.getByText(/Protecting against security threats/))
        .toBeInTheDocument();
    });

    it("should state essential cookies cannot be disabled", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Essential cookies cannot be disabled/))
        .toBeInTheDocument();
    });

    it("should explain impact of blocking essential cookies", () => {
      render(<CookiePage />);
      const bodyText = screen.getAllByText(/will not be able to log in/)[0];
      expect(bodyText).toBeInTheDocument();
      expect(screen.getByText(/authenticate with Google or GitHub/))
        .toBeInTheDocument();
    });

    it("should clarify essential cookies are not for tracking", () => {
      render(<CookiePage />);
      expect(screen.getByText(/not used for tracking or marketing purposes/))
        .toBeInTheDocument();
    });

    it("should describe authjs.session-token", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Stores your authentication session/))
        .toBeInTheDocument();
      expect(screen.getByText(/NextAuth.js when you log in/))
        .toBeInTheDocument();
    });

    it("should describe CSRF token details", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(/Protects against Cross-Site Request Forgery attacks/),
      )
        .toBeInTheDocument();
      expect(screen.getByText(/Required for secure form submissions/))
        .toBeInTheDocument();
    });

    it("should describe callback URL cookie", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /Stores the URL to redirect to after OAuth authentication completes/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should describe OAuth nonce details", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Security token used in OAuth flows/))
        .toBeInTheDocument();
      expect(screen.getByText(/prevent replay attacks/)).toBeInTheDocument();
    });
  });

  describe("Analytics Cookies Section", () => {
    it("should explain what analytics cookies track", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Understand which features are most popular"))
        .toBe(true);
      expect(bodyText?.includes("Identify performance issues")).toBe(true);
      expect(bodyText?.includes("Improve the user experience")).toBe(true);
    });

    it("should explain Vercel Analytics", () => {
      render(<CookiePage />);
      expect(screen.getByText("Vercel Analytics")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Tracks page views, user interactions, and performance metrics/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should describe Vercel Analytics data collection", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Page URLs, referrer, device type, browser type/))
        .toBeInTheDocument();
    });

    it("should state Vercel Analytics does not use cookies", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(/Vercel Analytics does not use cookies for tracking/),
      )
        .toBeInTheDocument();
    });

    it("should explain Vercel Speed Insights", () => {
      render(<CookiePage />);
      expect(screen.getByText("Vercel Speed Insights")).toBeInTheDocument();
      expect(
        screen.getByText(/Monitors application performance and loading speeds/),
      )
        .toBeInTheDocument();
    });

    it("should describe Speed Insights data", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /Page load times, Core Web Vitals, performance metrics/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should explain how to opt out of analytics", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Block cookies from analytics services")).toBe(
        true,
      );
      expect(bodyText?.includes('Set "Do Not Track" preference')).toBe(true);
      expect(bodyText?.includes("Use private/incognito browsing")).toBe(true);
    });

    it("should mention browser extensions for privacy", () => {
      render(<CookiePage />);
      expect(screen.getByText(/uBlock Origin, Privacy Badger, Ghostery/))
        .toBeInTheDocument();
    });

    it("should provide Vercel privacy policy link", () => {
      const { container } = render(<CookiePage />);
      const vercelLink = container.querySelector(
        'a[href="https://vercel.com/legal/privacy-policy"]',
      );
      expect(vercelLink).toBeInTheDocument();
    });
  });

  describe("Third-Party Cookies Section", () => {
    it("should explain third-party cookies purpose", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /external services that are embedded in our application/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should explain Google OAuth", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Google OAuth")).toBe(true);
      expect(
        bodyText?.includes(
          'When you click "Sign in with Google," Google sets cookies',
        ),
      ).toBe(
        true,
      );
    });

    it("should provide Google Privacy Policy link", () => {
      const { container } = render(<CookiePage />);
      const googleLink = container.querySelector(
        'a[href="https://policies.google.com/privacy"]',
      );
      expect(googleLink).toBeInTheDocument();
    });

    it("should provide Google Cookies Policy link", () => {
      const { container } = render(<CookiePage />);
      const googleCookiesLink = container.querySelector(
        'a[href="https://policies.google.com/technologies/cookies"]',
      );
      expect(googleCookiesLink).toBeInTheDocument();
    });

    it("should explain GitHub OAuth", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("GitHub OAuth")).toBe(true);
      expect(
        bodyText?.includes(
          'When you click "Sign in with GitHub," GitHub sets cookies',
        ),
      ).toBe(
        true,
      );
    });

    it("should provide GitHub Privacy Statement link", () => {
      const { container } = render(<CookiePage />);
      const githubLink = container.querySelector(
        'a[href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"]',
      );
      expect(githubLink).toBeInTheDocument();
    });

    it("should explain Stripe cookie usage", () => {
      render(<CookiePage />);
      expect(screen.getByText("Stripe (Payment Processing)"))
        .toBeInTheDocument();
      expect(screen.getByText(/When you make a payment, Stripe sets cookies/))
        .toBeInTheDocument();
    });

    it("should explain Stripe fraud prevention", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(/securely process your transaction and prevent fraud/),
      )
        .toBeInTheDocument();
    });

    it("should clarify we do not store credit cards", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /Stripe does not store your credit card information on our servers/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should mention Stripe PCI DSS compliance", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Stripe is PCI DSS Level 1 certified/))
        .toBeInTheDocument();
    });

    it("should provide Stripe Privacy Center link", () => {
      const { container } = render(<CookiePage />);
      const stripeLink = container.querySelector(
        'a[href="https://stripe.com/privacy"]',
      );
      expect(stripeLink).toBeInTheDocument();
    });

    it("should provide Stripe Cookies Policy link", () => {
      const { container } = render(<CookiePage />);
      const stripeCookiesLink = container.querySelector(
        'a[href="https://stripe.com/cookies-policy"]',
      );
      expect(stripeCookiesLink).toBeInTheDocument();
    });

    it("should explain user control over third-party cookies", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Block cookies from these services/))
        .toBeInTheDocument();
      expect(screen.getByText(/Review each service's privacy policy/))
        .toBeInTheDocument();
    });
  });

  describe("Managing Cookies Section", () => {
    it("should provide Chrome instructions", () => {
      const { container } = render(<CookiePage />);
      expect(screen.getByText(/Google Chrome/)).toBeInTheDocument();
      const bodyText = container.textContent;
      expect(
        bodyText?.includes("Click Menu (three dots) in the top right corner"),
      ).toBe(true);
    });

    it("should provide Firefox instructions", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Firefox/)).toBeInTheDocument();
      expect(
        screen.getByText(/Click Menu \(three lines\) in the top right corner/),
      )
        .toBeInTheDocument();
    });

    it("should provide Safari instructions", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Safari")).toBe(true);
      expect(bodyText?.includes("Click Safari menu")).toBe(true);
      expect(bodyText?.includes("Click Privacy tab")).toBe(true);
    });

    it("should provide Edge instructions", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Microsoft Edge")).toBe(true);
      expect(
        bodyText?.includes("Click Menu (three dots) in the top right corner"),
      ).toBe(true);
      expect(bodyText?.includes("Privacy, search, and services")).toBe(true);
    });

    it("should warn about disabling cookies impact", () => {
      render(<CookiePage />);
      expect(screen.getByText(/You will not be able to log in to your account/))
        .toBeInTheDocument();
      expect(screen.getByText(/Google and GitHub authentication will not work/))
        .toBeInTheDocument();
      expect(screen.getByText(/Payment processing may be blocked/))
        .toBeInTheDocument();
    });

    it("should explain how to clear cookies", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Clear browsing data")).toBe(true);
      expect(bodyText?.includes("Cookies and other site data")).toBe(true);
    });

    it("should warn about clearing cookies side effects", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(/Clearing cookies will log you out of your account/),
      )
        .toBeInTheDocument();
    });

    it("should explain Do Not Track", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Do Not Track \(DNT\)/)).toBeInTheDocument();
      expect(screen.getByText(/send a "Do Not Track" signal to websites/))
        .toBeInTheDocument();
    });
  });

  describe("Cookie Consent Section", () => {
    it("should explain how consent is obtained", () => {
      render(<CookiePage />);
      expect(screen.getByText(/A cookie consent banner appears on your screen/))
        .toBeInTheDocument();
      expect(screen.getByText(/Essential cookies are set immediately/))
        .toBeInTheDocument();
    });

    it("should explain Accept All option", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Accept all/)).toBeInTheDocument();
      expect(screen.getByText(/Accept all cookies, including analytics/))
        .toBeInTheDocument();
    });

    it("should explain Reject Non-Essential option", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Reject Non-Essential/)).toBeInTheDocument();
      expect(screen.getByText(/Accept only essential cookies/))
        .toBeInTheDocument();
    });

    it("should explain Customize option", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Customize/)).toBeInTheDocument();
      expect(
        screen.getByText(
          /Choose which specific cookie categories to accept or reject/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should mention GDPR Article 7 compliance", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /GDPR Article 7 and the ePrivacy Directive requirements/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should list GDPR consent requirements", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Consent must be freely given/))
        .toBeInTheDocument();
      expect(screen.getByText(/Consent must be specific/)).toBeInTheDocument();
      expect(screen.getByText(/Consent must be informed/)).toBeInTheDocument();
      expect(screen.getByText(/Consent must be affirmative/))
        .toBeInTheDocument();
      expect(screen.getByText(/You can withdraw consent at any time/))
        .toBeInTheDocument();
    });

    it("should explain how to change preferences", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /Look for a "Cookie Settings" link at the bottom of the page/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should specify consent expiration period", () => {
      render(<CookiePage />);
      expect(screen.getByText(/stored for 12 months/)).toBeInTheDocument();
    });

    it("should mention consent for non-EU users", () => {
      render(<CookiePage />);
      expect(screen.getByText(/apply the same consent standards to all users/))
        .toBeInTheDocument();
    });
  });

  describe("Policy Updates Section", () => {
    it("should explain right to modify policy", () => {
      render(<CookiePage />);
      expect(screen.getByText(/may update this Cookie Policy at any time/))
        .toBeInTheDocument();
    });

    it("should list reasons for updates", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Changes in our cookie usage practices/))
        .toBeInTheDocument();
      expect(screen.getByText(/New third-party services/)).toBeInTheDocument();
      expect(screen.getByText(/Changes to regulations or legal requirements/))
        .toBeInTheDocument();
    });

    it("should explain notification process", () => {
      render(<CookiePage />);
      expect(screen.getByText(/update the "Last updated" date/))
        .toBeInTheDocument();
      expect(
        screen.getByText(/post a notice on our website for at least 30 days/),
      )
        .toBeInTheDocument();
      expect(screen.getByText(/send an email notification/))
        .toBeInTheDocument();
    });

    it("should mention renewed consent for significant changes", () => {
      render(<CookiePage />);
      expect(screen.getByText(/ask for renewed consent if required by law/))
        .toBeInTheDocument();
    });

    it("should mention version history availability", () => {
      render(<CookiePage />);
      expect(screen.getByText(/maintain a version history of this policy/))
        .toBeInTheDocument();
    });
  });

  describe("Contact Section", () => {
    it("should display privacy contact email", () => {
      render(<CookiePage />);
      const emailLink = screen.getByRole("link", {
        name: /hello@spike\.land/,
      });
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute(
        "href",
        "mailto:hello@spike.land",
      );
    });

    it("should specify response time", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Response time: 72 hours/)).toBeInTheDocument();
    });

    it("should explain how to change cookie preferences", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /look for the "Cookie Settings" link at the bottom of the page/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should reference Privacy Policy link", () => {
      const { container } = render(<CookiePage />);
      const privacyLink = container.querySelector('a[href="/privacy"]');
      expect(privacyLink).toBeInTheDocument();
    });

    it("should reference Terms of Service link", () => {
      const { container } = render(<CookiePage />);
      const termsLink = container.querySelector('a[href="/terms"]');
      expect(termsLink).toBeInTheDocument();
    });

    it("should provide ICO link for UK", () => {
      const { container } = render(<CookiePage />);
      const icoLink = container.querySelector('a[href="https://ico.org.uk"]');
      expect(icoLink).toBeInTheDocument();
    });

    it("should mention EU local authorities", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Your local Data Protection Authority/))
        .toBeInTheDocument();
    });

    it("should provide FTC link for US", () => {
      const { container } = render(<CookiePage />);
      const ftcLink = container.querySelector('a[href="https://www.ftc.gov"]');
      expect(ftcLink).toBeInTheDocument();
    });
  });

  describe("Legal Disclaimer", () => {
    it("should display legal disclaimer", () => {
      render(<CookiePage />);
      expect(screen.getByText("Legal Disclaimer")).toBeInTheDocument();
    });

    it("should state this is a template", () => {
      render(<CookiePage />);
      expect(screen.getByText(/template for informational purposes only/))
        .toBeInTheDocument();
    });

    it("should recommend legal consultation", () => {
      render(<CookiePage />);
      expect(screen.getByText(/consult with a qualified attorney/))
        .toBeInTheDocument();
    });

    it("should mention cookie laws complexity", () => {
      render(<CookiePage />);
      expect(screen.getByText(/cookie laws are complex and evolve frequently/))
        .toBeInTheDocument();
    });
  });

  describe("Navigation and Links", () => {
    it("should have table of contents links", () => {
      const { container } = render(<CookiePage />);
      const introLink = container.querySelector('a[href="#introduction"]');
      expect(introLink).toBeInTheDocument();
    });

    it("should link to all major sections", () => {
      const { container } = render(<CookiePage />);
      expect(container.querySelector('a[href="#introduction"]'))
        .toBeInTheDocument();
      expect(container.querySelector('a[href="#cookies-used"]'))
        .toBeInTheDocument();
      expect(container.querySelector('a[href="#essential"]'))
        .toBeInTheDocument();
      expect(container.querySelector('a[href="#analytics"]'))
        .toBeInTheDocument();
      expect(container.querySelector('a[href="#third-party"]'))
        .toBeInTheDocument();
      expect(container.querySelector('a[href="#managing-cookies"]'))
        .toBeInTheDocument();
      expect(container.querySelector('a[href="#consent"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#updates"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="#contact"]')).toBeInTheDocument();
    });

    it("should have section IDs matching anchor links", () => {
      const { container } = render(<CookiePage />);
      const introSection = container.querySelector("#introduction");
      expect(introSection).toBeInTheDocument();
      const textInSection = introSection?.textContent;
      expect(textInSection?.includes("Definition")).toBe(true);
    });

    it("should have external links with proper attributes", () => {
      const { container } = render(<CookiePage />);
      const externalLinks = container.querySelectorAll('a[href^="http"]');
      expect(externalLinks.length).toBeGreaterThan(0);
      externalLinks.forEach((link) => {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      });
    });
  });

  describe("Compliance Coverage", () => {
    it("should cover GDPR cookie consent requirements", () => {
      render(<CookiePage />);
      expect(screen.getByText(/GDPR Article 7 and the ePrivacy Directive/))
        .toBeInTheDocument();
      expect(screen.getByText(/Consent must be freely given/))
        .toBeInTheDocument();
    });

    it("should cover ePrivacy Directive requirements", () => {
      render(<CookiePage />);
      expect(screen.getByText(/ePrivacy Directive requirements/))
        .toBeInTheDocument();
    });

    it("should explain cookie persistence and duration", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Session or 30 days")).toBe(true);
      expect(bodyText?.includes("Session only")).toBe(true);
    });

    it("should cover user rights to withdraw consent", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(/You can change your cookie preferences at any time/),
      )
        .toBeInTheDocument();
    });

    it("should cover security and HTTPS considerations", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Secure session token \(HTTPS\)/))
        .toBeInTheDocument();
    });
  });

  describe("Content Completeness", () => {
    it("should mention all major services using cookies", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("NextAuth.js")).toBe(true);
      expect(bodyText?.includes("Vercel")).toBe(true);
      expect(bodyText?.includes("Google")).toBe(true);
      expect(bodyText?.includes("GitHub")).toBe(true);
      expect(bodyText?.includes("Stripe")).toBe(true);
    });

    it("should specify all cookie types", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Essential")).toBe(true);
      expect(bodyText?.includes("Analytics")).toBe(true);
      expect(bodyText?.includes("Third-Party")).toBe(true);
    });

    it("should cover session and persistent cookies", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Session Cookies/)).toBeInTheDocument();
      expect(screen.getByText(/Persistent Cookies/)).toBeInTheDocument();
    });

    it("should cover first-party and third-party cookies", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("First-Party Cookies")).toBe(true);
      expect(bodyText?.includes("Third-Party Cookies")).toBe(true);
    });

    it("should mention all major browsers", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Google Chrome")).toBe(true);
      expect(bodyText?.includes("Firefox")).toBe(true);
      expect(bodyText?.includes("Safari")).toBe(true);
      expect(bodyText?.includes("Microsoft Edge")).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const { container } = render(<CookiePage />);
      const h1 = container.querySelectorAll("h1");
      expect(h1.length).toBeGreaterThan(0);
      const allHeadings = container.querySelectorAll("h1, h2, h3, h4");
      expect(allHeadings.length).toBeGreaterThan(5);
    });

    it("should have semantic structure", () => {
      const { container } = render(<CookiePage />);
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThan(0);
    });

    it("should have proper link attributes for external links", () => {
      const { container } = render(<CookiePage />);
      const externalLinks = container.querySelectorAll('a[href^="http"]');
      expect(externalLinks.length).toBeGreaterThan(0);
      externalLinks.forEach((link) => {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      });
    });

    it("should have proper email link format", () => {
      const { container } = render(<CookiePage />);
      const emailLinks = container.querySelectorAll('a[href^="mailto:"]');
      expect(emailLinks.length).toBeGreaterThan(0);
    });

    it("should use semantic cards for content sections", () => {
      const { container } = render(<CookiePage />);
      const cards = container.querySelectorAll('[class*="card"]');
      expect(cards.length).toBeGreaterThan(5);
    });
  });

  describe("Cookie Details and Specificity", () => {
    it("should specify cookie durations accurately", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("Session / 30 days")).toBe(true);
      expect(bodyText?.includes("1 year")).toBe(true);
      expect(bodyText?.includes("2 years")).toBe(true);
    });

    it("should explain secure vs non-secure cookies", () => {
      const { container } = render(<CookiePage />);
      const bodyText = container.textContent;
      expect(bodyText?.includes("__Secure-authjs.session-token")).toBe(true);
      expect(bodyText?.includes("only sent over HTTPS connections")).toBe(true);
    });

    it("should mention NextAuth.js specifically", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Set by NextAuth.js/)).toBeInTheDocument();
    });

    it("should explain Vercel insights caching", () => {
      render(<CookiePage />);
      expect(screen.getByText(/__Vercel_Insights_Cache/)).toBeInTheDocument();
    });
  });

  describe("Privacy and Security Information", () => {
    it("should clarify no credit card storage", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /Stripe does not store your credit card information on our servers/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should mention PCI DSS compliance", () => {
      render(<CookiePage />);
      expect(screen.getByText(/PCI DSS Level 1 certified/)).toBeInTheDocument();
      expect(screen.getByText(/highest security standards/))
        .toBeInTheDocument();
    });

    it("should explain CSRF protection cookies", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Cross-Site Request Forgery attacks/))
        .toBeInTheDocument();
      expect(screen.getByText(/secure form submissions/)).toBeInTheDocument();
    });

    it("should explain OAuth security nonce", () => {
      render(<CookiePage />);
      expect(screen.getByText(/prevent replay attacks/)).toBeInTheDocument();
    });

    it("should explain approximate location tracking", () => {
      render(<CookiePage />);
      expect(screen.getByText(/approximate location \(country level\)/))
        .toBeInTheDocument();
    });
  });

  describe("User Consent Preferences", () => {
    it("should explain the consent banner display", () => {
      render(<CookiePage />);
      expect(screen.getByText(/When you first visit/)).toBeInTheDocument();
    });

    it("should explain choice saving mechanism", () => {
      render(<CookiePage />);
      expect(screen.getByText(/Your choice is saved in your browser/))
        .toBeInTheDocument();
    });

    it("should mention 12-month consent expiration", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /Your cookie consent preferences are stored for 12 months/,
        ),
      )
        .toBeInTheDocument();
    });

    it("should explain re-confirmation process", () => {
      render(<CookiePage />);
      expect(screen.getByText(/may ask you to confirm your preferences again/))
        .toBeInTheDocument();
    });
  });

  describe("Legal Information", () => {
    it("should use yellow warning styling for disclaimer", () => {
      const { container } = render(<CookiePage />);
      const disclaimer = container.querySelector('[class*="yellow"]');
      expect(disclaimer).toBeInTheDocument();
    });

    it("should provide comprehensive legal notice", () => {
      render(<CookiePage />);
      expect(screen.getByText(/template for informational purposes only/))
        .toBeInTheDocument();
      expect(screen.getByText(/cookie laws are complex and evolve frequently/))
        .toBeInTheDocument();
    });

    it("should recommend attorney consultation", () => {
      render(<CookiePage />);
      expect(
        screen.getByText(
          /qualified attorney who specializes in privacy and data protection law/,
        ),
      ).toBeInTheDocument();
    });

    it("should recommend customization", () => {
      render(<CookiePage />);
      expect(screen.getByText(/customize it for your specific cookie usage/))
        .toBeInTheDocument();
    });
  });
});
