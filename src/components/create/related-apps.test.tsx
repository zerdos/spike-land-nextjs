import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("lucide-react", () => ({
  Sparkles: () => <span data-testid="sparkles-icon" />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("./live-app-preview", () => ({
  LiveAppPreview: ({ codespaceId }: { codespaceId: string }) => (
    <div data-testid={`live-preview-${codespaceId}`}>Preview</div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" "),
}));

import { RelatedApps } from "./related-apps";

// Helper to build a mock CreatedApp-like object
function mockApp(overrides: Record<string, unknown> = {}) {
  return {
    id: "app-1",
    slug: "test-app",
    title: "Test App",
    description: "A test application",
    codespaceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("RelatedApps", () => {
  it("returns null when no links and no published apps", () => {
    const { container } = render(
      <RelatedApps links={[]} publishedApps={[]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders links section when links are provided", () => {
    render(
      <RelatedApps links={["todo-list", "calculator"]} />,
    );

    expect(screen.getByText("Generate New")).toBeInTheDocument();
    expect(screen.getByText("todo list")).toBeInTheDocument();
    expect(screen.getByText("calculator")).toBeInTheDocument();
  });

  it("formats link labels by removing dashes", () => {
    render(
      <RelatedApps links={["my-cool-app"]} />,
    );

    // The label should have dashes replaced with spaces
    expect(screen.getByText("my cool app")).toBeInTheDocument();
  });

  it("renders published apps section when publishedApps are provided", () => {
    const apps = [
      mockApp({ id: "1", slug: "app-one", title: "App One" }),
      mockApp({ id: "2", slug: "app-two", title: "App Two" }),
    ];

    render(
      <RelatedApps links={[]} publishedApps={apps as never} />,
    );

    expect(screen.getByText("More Apps")).toBeInTheDocument();
    expect(screen.getByText("App One")).toBeInTheDocument();
    expect(screen.getByText("App Two")).toBeInTheDocument();
  });

  it("shows live preview for apps with codespaceId", () => {
    const apps = [
      mockApp({ id: "1", slug: "live-app", title: "Live App", codespaceId: "cs-123" }),
    ];

    render(
      <RelatedApps links={[]} publishedApps={apps as never} />,
    );

    expect(screen.getByTestId("live-preview-cs-123")).toBeInTheDocument();
  });

  it("does not render live preview for apps without codespaceId", () => {
    const apps = [
      mockApp({ id: "1", slug: "static-app", title: "Static App", codespaceId: null }),
    ];

    render(
      <RelatedApps links={[]} publishedApps={apps as never} />,
    );

    expect(screen.queryByTestId(/^live-preview-/)).not.toBeInTheDocument();
    expect(screen.getByText("Static App")).toBeInTheDocument();
  });

  it("shows separator border when both links and apps exist", () => {
    const apps = [
      mockApp({ id: "1", slug: "both-app", title: "Both App" }),
    ];

    const { container } = render(
      <RelatedApps links={["some-link"]} publishedApps={apps as never} />,
    );

    // The published apps section div gets border-t when hasLinks is true
    const publishedSection = container.querySelector(".border-t.p-3");
    expect(publishedSection).toBeTruthy();
  });

  it("links navigate to correct /create/ URLs", () => {
    const apps = [
      mockApp({ id: "1", slug: "nav-app", title: "Nav App" }),
    ];

    render(
      <RelatedApps links={["calc-tool"]} publishedApps={apps as never} />,
    );

    const links = screen.getAllByRole("link");
    const linkHrefs = links.map((link) => link.getAttribute("href"));

    expect(linkHrefs).toContain("/create/calc-tool");
    expect(linkHrefs).toContain("/create/nav-app");
  });

  it("applies custom className", () => {
    const { container } = render(
      <RelatedApps links={["something"]} className="my-custom-class" />,
    );

    const outerDiv = container.firstElementChild;
    expect(outerDiv?.className).toContain("my-custom-class");
  });

  it("shows help text at bottom", () => {
    render(
      <RelatedApps links={["any-link"]} />,
    );

    expect(
      screen.getByText("Try typing any path in the URL to generate a new app!"),
    ).toBeInTheDocument();
  });
});
