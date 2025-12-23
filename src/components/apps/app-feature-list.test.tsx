import { render, screen } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { describe, expect, it } from "vitest";
import { AppFeatureList, type Feature } from "./app-feature-list";

describe("AppFeatureList", () => {
  const mockFeatures: Feature[] = [
    {
      id: "feature-1",
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      title: "Test Feature 1",
      description: "This is the first test feature",
    },
    {
      id: "feature-2",
      title: "Test Feature 2",
      description: "This is the second test feature",
    },
    {
      id: "feature-3",
      icon: <div>Custom Icon</div>,
      title: "Test Feature 3",
      description: "This is the third test feature",
    },
  ];

  describe("Grid Layout", () => {
    it("should render features in grid layout", () => {
      render(<AppFeatureList features={mockFeatures} layout="grid" />);

      expect(screen.getByText("Test Feature 1")).toBeInTheDocument();
      expect(screen.getByText("This is the first test feature"))
        .toBeInTheDocument();
      expect(screen.getByText("Test Feature 2")).toBeInTheDocument();
      expect(screen.getByText("Test Feature 3")).toBeInTheDocument();
    });

    it("should render with 1 column grid", () => {
      const { container } = render(
        <AppFeatureList features={mockFeatures} layout="grid" columns={1} />,
      );

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass("grid");
      expect(gridContainer).toHaveClass("grid-cols-1");
    });

    it("should render with 2 column grid", () => {
      const { container } = render(
        <AppFeatureList features={mockFeatures} layout="grid" columns={2} />,
      );

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass("grid");
      expect(gridContainer).toHaveClass("md:grid-cols-2");
    });

    it("should render with 3 column grid", () => {
      const { container } = render(
        <AppFeatureList features={mockFeatures} layout="grid" columns={3} />,
      );

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass("grid");
      expect(gridContainer).toHaveClass("lg:grid-cols-3");
    });

    it("should use default 2 columns when columns prop is not provided", () => {
      const { container } = render(
        <AppFeatureList features={mockFeatures} layout="grid" />,
      );

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass("md:grid-cols-2");
    });
  });

  describe("List Layout", () => {
    it("should render features in list layout", () => {
      const { container } = render(
        <AppFeatureList features={mockFeatures} layout="list" />,
      );

      expect(screen.getByText("Test Feature 1")).toBeInTheDocument();
      expect(screen.getByText("Test Feature 2")).toBeInTheDocument();

      const listContainer = container.firstChild;
      expect(listContainer).toHaveClass("space-y-6");
    });

    it("should apply items-start class to list items", () => {
      const { container } = render(
        <AppFeatureList features={mockFeatures} layout="list" />,
      );

      const firstFeature = container.querySelector('[class*="items-start"]');
      expect(firstFeature).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("should render icon when provided", () => {
      render(<AppFeatureList features={[mockFeatures[0]!]} />);

      const iconContainer = screen.getByText("Test Feature 1").parentElement
        ?.previousSibling;
      expect(iconContainer).toHaveClass("flex-shrink-0");
      expect(iconContainer).toHaveClass("bg-primary/10");
    });

    it("should not render icon container when icon is not provided", () => {
      render(<AppFeatureList features={[mockFeatures[1]!]} />);

      const iconContainer = screen.getByText("Test Feature 2").parentElement
        ?.previousSibling;
      expect(iconContainer).toBeNull();
    });

    it("should render custom icon element", () => {
      render(<AppFeatureList features={[mockFeatures[2]!]} />);

      expect(screen.getByText("Custom Icon")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should render empty state when no features are provided", () => {
      render(<AppFeatureList features={[]} />);

      expect(screen.getByText("No features available")).toBeInTheDocument();
    });

    it("should apply custom className to empty state", () => {
      const { container } = render(
        <AppFeatureList features={[]} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Custom ClassName", () => {
    it("should apply custom className to container", () => {
      const { container } = render(
        <AppFeatureList features={mockFeatures} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Default Props", () => {
    it("should use grid layout by default", () => {
      const { container } = render(<AppFeatureList features={mockFeatures} />);

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass("grid");
    });
  });

  describe("Feature Content", () => {
    it("should render all feature titles", () => {
      render(<AppFeatureList features={mockFeatures} />);

      expect(screen.getByText("Test Feature 1")).toBeInTheDocument();
      expect(screen.getByText("Test Feature 2")).toBeInTheDocument();
      expect(screen.getByText("Test Feature 3")).toBeInTheDocument();
    });

    it("should render all feature descriptions", () => {
      render(<AppFeatureList features={mockFeatures} />);

      expect(screen.getByText("This is the first test feature"))
        .toBeInTheDocument();
      expect(screen.getByText("This is the second test feature"))
        .toBeInTheDocument();
      expect(screen.getByText("This is the third test feature"))
        .toBeInTheDocument();
    });

    it("should render correct number of feature items", () => {
      const { container } = render(<AppFeatureList features={mockFeatures} />);

      const featureItems = container.querySelectorAll(
        '[class*="rounded-lg"][class*="border"]',
      );
      expect(featureItems.length).toBe(3);
    });
  });
});
