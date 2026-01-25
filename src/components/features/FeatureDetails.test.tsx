import { render, screen } from "@testing-library/react";
import { Zap } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { FeatureDetails } from "./FeatureDetails";

// Mock framer-motion to avoid animation complexities in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileInView: _whileInView,
      viewport: _viewport,
      style,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      whileInView?: unknown;
      viewport?: unknown;
    }) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
    h2: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      whileInView: _whileInView,
      viewport: _viewport,
      ...props
    }: React.HTMLAttributes<HTMLHeadingElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      whileInView?: unknown;
      viewport?: unknown;
    }) => (
      <h2 className={className} {...props}>
        {children}
      </h2>
    ),
    p: ({
      children,
      className,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      whileInView: _whileInView,
      viewport: _viewport,
      ...props
    }: React.HTMLAttributes<HTMLParagraphElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      whileInView?: unknown;
      viewport?: unknown;
    }) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
  },
}));

// Mock the landing components
vi.mock("../landing-sections/shared/SectionWrapper", () => ({
  SectionWrapper: ({ children, className }: { children: React.ReactNode; className?: string; }) => (
    <section className={className}>{children}</section>
  ),
}));

vi.mock("../landing-sections/shared/ThemeCard", () => ({
  ThemeCard: ({
    children,
    className,
    hoverEffect: _hoverEffect,
  }: { children: React.ReactNode; className?: string; hoverEffect?: boolean; }) => (
    <div className={className}>{children}</div>
  ),
}));

describe("FeatureDetails", () => {
  const mockFeatures = [
    {
      icon: Zap,
      title: "Feature One",
      description: "Description for feature one",
    },
    {
      icon: Zap,
      title: "Feature Two",
      description: "Description for feature two",
    },
    {
      icon: Zap,
      title: "Feature Three",
      description: "Description for feature three",
    },
  ];

  it("should render all features", () => {
    render(<FeatureDetails features={mockFeatures} />);
    expect(screen.getByText("Feature One")).toBeInTheDocument();
    expect(screen.getByText("Feature Two")).toBeInTheDocument();
    expect(screen.getByText("Feature Three")).toBeInTheDocument();
  });

  it("should render feature descriptions", () => {
    render(<FeatureDetails features={mockFeatures} />);
    expect(screen.getByText("Description for feature one")).toBeInTheDocument();
    expect(screen.getByText("Description for feature two")).toBeInTheDocument();
    expect(screen.getByText("Description for feature three")).toBeInTheDocument();
  });

  it("should render title when provided", () => {
    render(<FeatureDetails features={mockFeatures} title="Section Title" />);
    expect(screen.getByText("Section Title")).toBeInTheDocument();
  });

  it("should render subtitle when provided", () => {
    render(
      <FeatureDetails
        features={mockFeatures}
        title="Section Title"
        subtitle="Section subtitle text"
      />,
    );
    expect(screen.getByText("Section subtitle text")).toBeInTheDocument();
  });

  it("should not render title section when neither title nor subtitle is provided", () => {
    render(<FeatureDetails features={mockFeatures} />);
    // Should only have feature headings, no section heading
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(3); // Only feature titles
  });

  it("should render with grid layout by default", () => {
    const { container } = render(<FeatureDetails features={mockFeatures} />);
    // Check for grid classes
    const gridElement = container.querySelector(".grid");
    expect(gridElement).toBeInTheDocument();
  });

  it("should handle empty features array", () => {
    const { container } = render(<FeatureDetails features={[]} />);
    // Should render without errors
    expect(container).toBeInTheDocument();
  });

  it("should render icons for each feature", () => {
    render(<FeatureDetails features={mockFeatures} />);
    // Zap icons should be rendered (3 features = 3 icons)
    const svgElements = document.querySelectorAll("svg");
    expect(svgElements.length).toBeGreaterThanOrEqual(3);
  });
});
