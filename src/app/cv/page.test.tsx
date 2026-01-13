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

    it("should display the professional summary", () => {
      render(<CVPage />);
      // Flexibly match part of the summary string in Hero or About
      const elements = screen.getAllByText(/Full Stack Developer with/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should display contact button", () => {
      render(<CVPage />);
      expect(screen.getByRole("link", { name: /Get In Touch/i })).toBeInTheDocument();
    });

    it("should have GitHub button", () => {
      render(<CVPage />);
      expect(screen.getByRole("link", { name: /GitHub/i })).toBeInTheDocument();
    });

    it("should display location", () => {
      render(<CVPage />);
      expect(screen.getByText(/Brighton, UK/)).toBeInTheDocument();
    });
  });

  describe("Metrics Section", () => {
    it("should render metrics cards", () => {
      render(<CVPage />);
      expect(screen.getByText("12+")).toBeInTheDocument();
      expect(screen.getAllByText("Packages").length).toBeGreaterThan(0);
      expect(screen.getByText("54")).toBeInTheDocument();
    });
  });

  describe("About Section", () => {
    it("should render the About heading", () => {
      render(<CVPage />);
      expect(screen.getByText(/About Me/i)).toBeInTheDocument();
    });

    it("should mention 12+ years experience in about text", () => {
      render(<CVPage />);
      const aboutTexts = screen.getAllByText(/12\+ years of experience/i);
      expect(aboutTexts.length).toBeGreaterThan(0);
    });

    it("should mention AI tools and productivity", () => {
      render(<CVPage />);
      expect(screen.getByText(/Claude Code/i)).toBeInTheDocument();
    });

    it("should display the quality triangle quote", () => {
      render(<CVPage />);
      expect(
        screen.getByText(/impossible triangle is broken/i),
      ).toBeInTheDocument();
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
      expect(screen.getAllByText(/Next.js 15/i).length).toBeGreaterThan(0);
    });

    it("should display backend skills", () => {
      render(<CVPage />);
      expect(screen.getAllByText("Node.js").length).toBeGreaterThan(0);
      expect(screen.getAllByText("PostgreSQL").length).toBeGreaterThan(0);
    });
  });

  describe("Featured Project Section", () => {
    it("should render the Featured Work heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Featured")).toBeInTheDocument();
      expect(screen.getByText("Work")).toBeInTheDocument();
    });

    it("should render Spike Land project card", () => {
      render(<CVPage />);
      expect(screen.getAllByText("Spike Land").length).toBeGreaterThan(0);
      expect(
        screen.getByText(/production platform proving that one developer/i),
      ).toBeInTheDocument();
    });

    it("should list tech stack tags", () => {
      render(<CVPage />);
      expect(screen.getAllByText(/Next.js 15/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cloudflare Workers").length).toBeGreaterThan(0);
    });
  });

  describe("Work Experience Section", () => {
    it("should render the Experience heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Journey")).toBeInTheDocument();
    });

    it("should display Virgin Media O2 role", () => {
      render(<CVPage />);
      expect(screen.getByText("Virgin Media O2 Limited")).toBeInTheDocument();
      const roles = screen.getAllByText("Frontend Developer");
      expect(roles.length).toBeGreaterThan(0);
    });

    it("should display Investec Bank role", () => {
      render(<CVPage />);
      expect(screen.getByText("Investec Bank")).toBeInTheDocument();
    });
  });

  describe("Writing Section", () => {
    it("should render the Writing heading", () => {
      render(<CVPage />);
      expect(screen.getByText("Writing")).toBeInTheDocument();
    });

    it("should display blog post titles", () => {
      render(<CVPage />);
      expect(screen.getByText(/My PRs Were Pure AI Slop/)).toBeInTheDocument();
    });
  });

  describe("Footer", () => {
    it("should have copyright", () => {
      render(<CVPage />);
      expect(screen.getByText(/Built with AI & Passion/i)).toBeInTheDocument();
    });
  });
});
