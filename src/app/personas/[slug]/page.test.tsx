import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PersonaPage, { generateMetadata, generateStaticParams } from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

describe("PersonaPage", () => {
  describe("generateStaticParams", () => {
    it("should return params for all 10 personas", async () => {
      const params = await Promise.resolve(generateStaticParams());
      expect(params).toHaveLength(10);
    });

    it("should return objects with slug property", async () => {
      const params = await Promise.resolve(generateStaticParams());
      for (const param of params) {
        expect(param).toHaveProperty("slug");
        expect(typeof param.slug).toBe("string");
      }
    });
  });

  describe("generateMetadata", () => {
    it("should return metadata for valid persona", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      expect(metadata.title).toContain("The Tech-Savvy Grandson");
      expect(metadata.description).toContain("Make grandma cry");
    });

    it("should return not found metadata for invalid slug", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "nonexistent" }),
      });
      expect(metadata.title).toBe("Persona Not Found | Spike Land");
    });
  });

  describe("rendering", () => {
    it("should render persona name", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("The Tech-Savvy Grandson")).toBeInTheDocument();
    });

    it("should render primary hook", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(
        screen.getByText(/Make grandma cry \(happy tears\)/),
      ).toBeInTheDocument();
    });

    it("should render demographics section", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Demographics")).toBeInTheDocument();
      expect(screen.getByText("25-35")).toBeInTheDocument();
    });

    it("should render psychographics section", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Psychographics")).toBeInTheDocument();
    });

    it("should render pain points section", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Pain Points")).toBeInTheDocument();
    });

    it("should render triggers section", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Triggers")).toBeInTheDocument();
    });

    it("should render ad copy variations", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Ad Copy Variations")).toBeInTheDocument();
    });

    it("should render content ideas", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Content Ideas")).toBeInTheDocument();
    });

    it("should render back link", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Back to All Personas")).toBeInTheDocument();
    });

    it("should render priority badge for primary personas", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Priority Target")).toBeInTheDocument();
    });

    it("should render share section", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Share this persona")).toBeInTheDocument();
    });

    it("should render warning note for sensitive personas", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "grieving-pet-owner" }),
      });
      render(Page);
      expect(
        screen.getByText(/Handle with sensitivity/),
      ).toBeInTheDocument();
    });

    it("should not render priority badge for secondary personas", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "memory-keeper" }),
      });
      render(Page);
      expect(screen.queryByText("Priority Target")).not.toBeInTheDocument();
    });

    it("should render navigation to next persona", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "tech-savvy-grandson" }),
      });
      render(Page);
      expect(screen.getByText("Next")).toBeInTheDocument();
      expect(
        screen.getByText("The Social Media Historian"),
      ).toBeInTheDocument();
    });

    it("should render navigation to previous persona", async () => {
      const Page = await PersonaPage({
        params: Promise.resolve({ slug: "social-media-historian" }),
      });
      render(Page);
      expect(screen.getByText("Previous")).toBeInTheDocument();
    });
  });
});
