import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

describe("Card Components", () => {
  describe("Card", () => {
    it("should render card with children", () => {
      render(<Card data-testid="card">Card Content</Card>);
      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    it("should apply default card classes", () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId("card");
      expect(card).toHaveClass(
        "rounded-2xl",
        "border",
        "text-card-foreground",
        "shadow-lg",
      );
    });

    it("should merge custom className", () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>);
      expect(screen.getByTestId("card")).toHaveClass("custom-class");
    });

    it("should forward ref correctly", () => {
      const ref = { current: null };
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should have correct display name", () => {
      expect(Card.displayName).toBe("Card");
    });

    it("should pass through additional props", () => {
      render(<Card data-testid="card" aria-label="Test Card">Content</Card>);
      const card = screen.getByTestId("card");
      expect(card).toHaveAttribute("aria-label", "Test Card");
    });
  });

  describe("CardHeader", () => {
    it("should render card header with children", () => {
      render(<CardHeader data-testid="header">Header Content</CardHeader>);
      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByText("Header Content")).toBeInTheDocument();
    });

    it("should apply default header classes", () => {
      render(<CardHeader data-testid="header">Content</CardHeader>);
      const header = screen.getByTestId("header");
      expect(header).toHaveClass("flex", "flex-col", "space-y-2", "p-7");
    });

    it("should merge custom className", () => {
      render(<CardHeader className="custom-header" data-testid="header">Content</CardHeader>);
      expect(screen.getByTestId("header")).toHaveClass("custom-header");
    });

    it("should forward ref correctly", () => {
      const ref = { current: null };
      render(<CardHeader ref={ref}>Content</CardHeader>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should have correct display name", () => {
      expect(CardHeader.displayName).toBe("CardHeader");
    });
  });

  describe("CardTitle", () => {
    it("should render card title with children", () => {
      render(<CardTitle data-testid="title">Title Content</CardTitle>);
      expect(screen.getByTestId("title")).toBeInTheDocument();
      expect(screen.getByText("Title Content")).toBeInTheDocument();
    });

    it("should apply default title classes", () => {
      render(<CardTitle data-testid="title">Content</CardTitle>);
      const title = screen.getByTestId("title");
      expect(title).toHaveClass("font-semibold", "leading-none", "tracking-tight");
    });

    it("should merge custom className", () => {
      render(<CardTitle className="custom-title" data-testid="title">Content</CardTitle>);
      expect(screen.getByTestId("title")).toHaveClass("custom-title");
    });

    it("should forward ref correctly", () => {
      const ref = { current: null };
      render(<CardTitle ref={ref}>Content</CardTitle>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should have correct display name", () => {
      expect(CardTitle.displayName).toBe("CardTitle");
    });
  });

  describe("CardDescription", () => {
    it("should render card description with children", () => {
      render(<CardDescription data-testid="description">Description Content</CardDescription>);
      expect(screen.getByTestId("description")).toBeInTheDocument();
      expect(screen.getByText("Description Content")).toBeInTheDocument();
    });

    it("should apply default description classes", () => {
      render(<CardDescription data-testid="description">Content</CardDescription>);
      const description = screen.getByTestId("description");
      expect(description).toHaveClass("text-sm", "text-muted-foreground");
    });

    it("should merge custom className", () => {
      render(
        <CardDescription className="custom-desc" data-testid="description">
          Content
        </CardDescription>,
      );
      expect(screen.getByTestId("description")).toHaveClass("custom-desc");
    });

    it("should forward ref correctly", () => {
      const ref = { current: null };
      render(<CardDescription ref={ref}>Content</CardDescription>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should have correct display name", () => {
      expect(CardDescription.displayName).toBe("CardDescription");
    });
  });

  describe("CardContent", () => {
    it("should render card content with children", () => {
      render(<CardContent data-testid="content">Content Text</CardContent>);
      expect(screen.getByTestId("content")).toBeInTheDocument();
      expect(screen.getByText("Content Text")).toBeInTheDocument();
    });

    it("should apply default content classes", () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId("content");
      expect(content).toHaveClass("p-7", "pt-0");
    });

    it("should merge custom className", () => {
      render(<CardContent className="custom-content" data-testid="content">Content</CardContent>);
      expect(screen.getByTestId("content")).toHaveClass("custom-content");
    });

    it("should forward ref correctly", () => {
      const ref = { current: null };
      render(<CardContent ref={ref}>Content</CardContent>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should have correct display name", () => {
      expect(CardContent.displayName).toBe("CardContent");
    });
  });

  describe("CardFooter", () => {
    it("should render card footer with children", () => {
      render(<CardFooter data-testid="footer">Footer Content</CardFooter>);
      expect(screen.getByTestId("footer")).toBeInTheDocument();
      expect(screen.getByText("Footer Content")).toBeInTheDocument();
    });

    it("should apply default footer classes", () => {
      render(<CardFooter data-testid="footer">Content</CardFooter>);
      const footer = screen.getByTestId("footer");
      expect(footer).toHaveClass("flex", "items-center", "p-7", "pt-0");
    });

    it("should merge custom className", () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Content</CardFooter>);
      expect(screen.getByTestId("footer")).toHaveClass("custom-footer");
    });

    it("should forward ref correctly", () => {
      const ref = { current: null };
      render(<CardFooter ref={ref}>Content</CardFooter>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("should have correct display name", () => {
      expect(CardFooter.displayName).toBe("CardFooter");
    });
  });

  describe("Integrated Card Structure", () => {
    it("should render complete card with all components", () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Test Content</CardContent>
          <CardFooter>Test Footer</CardFooter>
        </Card>,
      );

      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
      expect(screen.getByText("Test Footer")).toBeInTheDocument();
    });
  });
});
