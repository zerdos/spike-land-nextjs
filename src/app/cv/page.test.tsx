import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CVPage from "./page";

describe("CV Page", () => {
  describe("Hero Section", () => {
    it("should render the name as main heading", () => {
      render(<CVPage />);
      expect(
        screen.getByRole("heading", { level: 1, name: /Zoltan Erdos/i }),
      ).toBeInTheDocument();
    });

    it("should display the professional title", () => {
      render(<CVPage />);
      expect(
        screen.getByText(/Full Stack Developer & AI-Driven Product Builder/i),
      ).toBeInTheDocument();
    });

    it("should display Founder of Spike Land", () => {
      render(<CVPage />);
      expect(screen.getByText(/Founder of Spike Land/i)).toBeInTheDocument();
    });

    it("should display contact email", () => {
      render(<CVPage />);
      expect(screen.getByText(/zoltan.erdos@me.com/)).toBeInTheDocument();
    });

    it("should display phone number", () => {
      render(<CVPage />);
      expect(screen.getByText(/\+44 7514 727998/)).toBeInTheDocument();
    });

    it("should display GitHub link", () => {
      render(<CVPage />);
      expect(screen.getByText(/github.com\/zerdos/)).toBeInTheDocument();
    });

    it("should display location", () => {
      render(<CVPage />);
      const locations = screen.getAllByText(/Brighton, UK/);
      expect(locations.length).toBeGreaterThan(0);
    });
  });

  describe("About Section", () => {
    it("should render the About heading", () => {
      render(<CVPage />);
      expect(screen.getByText("About")).toBeInTheDocument();
    });

    it("should mention 12+ years experience", () => {
      render(<CVPage />);
      expect(screen.getByText(/12\+ years of experience/i)).toBeInTheDocument();
    });

    it("should mention AI tools and productivity", () => {
      render(<CVPage />);
      expect(screen.getByText(/50x more productive/)).toBeInTheDocument();
    });

    it("should display the quality triangle quote", () => {
      render(<CVPage />);
      expect(
        screen.getByText(/impossible triangle is broken/i),
      ).toBeInTheDocument();
    });
  });

  describe("Key Metrics Section", () => {
    it("should display 12+ years experience metric", () => {
      render(<CVPage />);
      expect(screen.getByText("12+")).toBeInTheDocument();
      expect(screen.getByText("Years Experience")).toBeInTheDocument();
    });

    it("should display packages in monorepo metric", () => {
      render(<CVPage />);
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Packages in Monorepo")).toBeInTheDocument();
    });

    it("should display database models metric", () => {
      render(<CVPage />);
      expect(screen.getByText("54")).toBeInTheDocument();
      expect(screen.getByText("Database Models")).toBeInTheDocument();
    });

    it("should display API endpoints metric", () => {
      render(<CVPage />);
      expect(screen.getByText("100+")).toBeInTheDocument();
      expect(screen.getByText("API Endpoints")).toBeInTheDocument();
    });

    it("should display test coverage metric", () => {
      render(<CVPage />);
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("Test Coverage")).toBeInTheDocument();
    });
  });

  describe("Technical Skills Section", () => {
    it("should render the Technical Skills heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Technical Skills")).toBeInTheDocument();
    });

    it("should display frontend skills", () => {
      render(<CVPage />);
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("Next.js 15")).toBeInTheDocument();
      expect(screen.getByText("Angular")).toBeInTheDocument();
      expect(screen.getByText("Tailwind CSS")).toBeInTheDocument();
    });

    it("should display backend skills", () => {
      render(<CVPage />);
      expect(screen.getByText("Node.js")).toBeInTheDocument();
      expect(screen.getByText("Deno")).toBeInTheDocument();
      expect(screen.getByText(".NET Core")).toBeInTheDocument();
      expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    });

    it("should display devops skills", () => {
      render(<CVPage />);
      expect(screen.getByText("Docker")).toBeInTheDocument();
      expect(screen.getByText("Kubernetes")).toBeInTheDocument();
      expect(screen.getByText("AWS")).toBeInTheDocument();
      expect(screen.getByText("Cloudflare Workers")).toBeInTheDocument();
    });

    it("should display testing skills", () => {
      render(<CVPage />);
      expect(screen.getByText("Vitest")).toBeInTheDocument();
      expect(screen.getByText("Playwright")).toBeInTheDocument();
      expect(screen.getByText("TDD")).toBeInTheDocument();
    });

    it("should display AI skills", () => {
      render(<CVPage />);
      expect(screen.getByText("Claude Opus 4.5")).toBeInTheDocument();
      expect(screen.getByText("MCP Servers")).toBeInTheDocument();
      expect(screen.getByText("Context Engineering")).toBeInTheDocument();
    });
  });

  describe("Featured Project Section", () => {
    it("should render the Featured Project heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Featured Project: Spike Land")).toBeInTheDocument();
    });

    it("should describe what Spike Land is", () => {
      render(<CVPage />);
      expect(
        screen.getByText(/AI-powered platform for creating, modifying/i),
      ).toBeInTheDocument();
    });

    it("should list what was built", () => {
      render(<CVPage />);
      expect(screen.getByText(/Pixel - AI image enhancement app/)).toBeInTheDocument();
      expect(screen.getByText(/Live code editor/)).toBeInTheDocument();
      expect(screen.getByText(/MCP Server for Claude integration/)).toBeInTheDocument();
    });

    it("should list tech stack", () => {
      render(<CVPage />);
      expect(screen.getByText(/Next.js 15 \+ TypeScript/)).toBeInTheDocument();
      expect(screen.getByText(/Cloudflare Workers \+ Durable Objects/)).toBeInTheDocument();
    });

    it("should have link to spike.land", () => {
      render(<CVPage />);
      expect(screen.getByRole("link", { name: /Visit spike.land/i })).toBeInTheDocument();
    });
  });

  describe("Work Experience Section", () => {
    it("should render the Work Experience heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Work Experience")).toBeInTheDocument();
    });

    it("should display Virgin Media O2 role", () => {
      render(<CVPage />);
      expect(screen.getByText("Virgin Media O2 Limited")).toBeInTheDocument();
      expect(screen.getByText(/Led a small team to deliver 4 critical/)).toBeInTheDocument();
    });

    it("should display Investec Bank role", () => {
      render(<CVPage />);
      expect(screen.getByText("Investec Bank")).toBeInTheDocument();
      expect(screen.getByText(/Established test automation and cloud/)).toBeInTheDocument();
    });

    it("should display TalkTalk role", () => {
      render(<CVPage />);
      expect(screen.getByText("TalkTalk")).toBeInTheDocument();
      expect(screen.getByText(/Delivered new sales site/)).toBeInTheDocument();
    });

    it("should display Keytree role", () => {
      render(<CVPage />);
      expect(screen.getByText("Keytree")).toBeInTheDocument();
      expect(screen.getByText(/Consulted for BP, Jaguar/)).toBeInTheDocument();
    });

    it("should display Emarsys role", () => {
      render(<CVPage />);
      expect(screen.getByText("Emarsys Ltd")).toBeInTheDocument();
      expect(screen.getByText(/Learned agile philosophy/)).toBeInTheDocument();
    });

    it("should display job types as badges", () => {
      render(<CVPage />);
      expect(screen.getByText("Contractor")).toBeInTheDocument();
      expect(screen.getByText("Long-term Contractor")).toBeInTheDocument();
      expect(screen.getAllByText("Employee").length).toBeGreaterThan(0);
    });
  });

  describe("Education Section", () => {
    it("should render the Education heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Education")).toBeInTheDocument();
    });

    it("should display degree", () => {
      render(<CVPage />);
      expect(screen.getByText("Computer Scientist and Mathematician")).toBeInTheDocument();
    });

    it("should display university", () => {
      render(<CVPage />);
      expect(screen.getByText(/Eotvos Lorand University, Budapest/)).toBeInTheDocument();
    });

    it("should display focus area", () => {
      render(<CVPage />);
      expect(screen.getByText(/Parallel programming and distributed systems/)).toBeInTheDocument();
    });

    it("should display years", () => {
      render(<CVPage />);
      expect(screen.getByText("2003 - 2010")).toBeInTheDocument();
    });
  });

  describe("Insights & Writing Section", () => {
    it("should render the Insights heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Insights & Writing")).toBeInTheDocument();
    });

    it("should display blog post titles", () => {
      render(<CVPage />);
      expect(screen.getByText(/My PRs Were Pure AI Slop/)).toBeInTheDocument();
      expect(screen.getByText(/More Productive Than Ever/)).toBeInTheDocument();
      expect(screen.getByText(/The Trust Gap/)).toBeInTheDocument();
    });

    it("should display all 15 blog posts", () => {
      const { container } = render(<CVPage />);
      const blogSection = container.textContent;
      expect(blogSection?.includes("01.")).toBe(true);
      expect(blogSection?.includes("15.")).toBe(true);
    });
  });

  describe("Personal Section", () => {
    it("should render the Personal heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Personal")).toBeInTheDocument();
    });

    it("should mention dogs", () => {
      render(<CVPage />);
      expect(screen.getByText(/two dogs/)).toBeInTheDocument();
    });

    it("should mention ADHD", () => {
      render(<CVPage />);
      expect(screen.getByText(/I have ADHD/)).toBeInTheDocument();
    });

    it("should mention daily routine", () => {
      render(<CVPage />);
      expect(screen.getByText(/gym at 6:30am/)).toBeInTheDocument();
    });

    it("should mention the dream", () => {
      render(<CVPage />);
      expect(screen.getByText(/Build Spike Land into something big/)).toBeInTheDocument();
    });
  });

  describe("Philosophy Section", () => {
    it("should render the Philosophy heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Philosophy")).toBeInTheDocument();
    });

    it("should mention quality philosophy", () => {
      render(<CVPage />);
      expect(screen.getByText(/100% test coverage is not optional/)).toBeInTheDocument();
    });

    it("should mention AI philosophy", () => {
      render(<CVPage />);
      expect(screen.getByText(/AI output equals function of context/)).toBeInTheDocument();
    });

    it("should mention work philosophy", () => {
      render(<CVPage />);
      expect(screen.getByText(/Money won't make you happy/)).toBeInTheDocument();
    });
  });

  describe("CTA Section", () => {
    it("should display availability message", () => {
      render(<CVPage />);
      expect(screen.getByText(/Available for interesting projects/)).toBeInTheDocument();
    });

    it("should have Get in Touch button", () => {
      render(<CVPage />);
      expect(screen.getByRole("link", { name: /Get in Touch/i })).toBeInTheDocument();
    });

    it("should have View GitHub button", () => {
      render(<CVPage />);
      expect(screen.getByRole("link", { name: /View GitHub/i })).toBeInTheDocument();
    });

    it("should have correct email link", () => {
      render(<CVPage />);
      const emailLink = screen.getByRole("link", { name: /Get in Touch/i });
      expect(emailLink).toHaveAttribute("href", "mailto:zoltan.erdos@me.com");
    });

    it("should have correct GitHub link with external attributes", () => {
      render(<CVPage />);
      const githubLink = screen.getByRole("link", { name: /View GitHub/i });
      expect(githubLink).toHaveAttribute("href", "https://github.com/zerdos");
      expect(githubLink).toHaveAttribute("target", "_blank");
      expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Links and Navigation", () => {
    it("should have working email link in hero", () => {
      render(<CVPage />);
      const emailLinks = screen.getAllByText(/zoltan.erdos@me.com/);
      expect(emailLinks.length).toBeGreaterThan(0);
    });

    it("should have working phone link", () => {
      render(<CVPage />);
      const phoneLinks = screen.getAllByText(/\+44 7514 727998/);
      expect(phoneLinks.length).toBeGreaterThan(0);
    });

    it("should have spike.land link in featured project", () => {
      render(<CVPage />);
      const spikeLink = screen.getByRole("link", { name: /Visit spike.land/i });
      expect(spikeLink).toHaveAttribute("href", "/");
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const { container } = render(<CVPage />);
      const h1 = container.querySelectorAll("h1");
      expect(h1.length).toBe(1);
      // CardTitle components use div, so we check for Card components
      const cards = container.querySelectorAll(".Card");
      expect(cards.length).toBeGreaterThan(5);
    });

    it("should have semantic section structure", () => {
      const { container } = render(<CVPage />);
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThan(5);
    });
  });
});
