import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Tabs Component", () => {
  describe("Tabs", () => {
    it("should render tabs container", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("should render with default value", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByText("Content 1")).toBeInTheDocument();
    });

    it("should switch tabs on trigger click", async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      expect(screen.getByText("Content 1")).toBeInTheDocument();

      await user.click(screen.getByText("Tab 2"));
      await waitFor(() => {
        expect(screen.getByText("Content 2")).toBeInTheDocument();
      });
    });

    it("should render with controlled value", () => {
      render(
        <Tabs value="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByText("Content 2")).toBeInTheDocument();
    });

    it("should handle onValueChange callback", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tabs defaultValue="tab1" onValueChange={onValueChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );

      await user.click(screen.getByText("Tab 2"));
      expect(onValueChange).toHaveBeenCalledWith("tab2");
    });

    it("should render with orientation prop", () => {
      const { container } = render(
        <Tabs defaultValue="tab1" orientation="vertical">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(container.firstChild).toHaveAttribute(
        "data-orientation",
        "vertical",
      );
    });

    it("should render with className prop", () => {
      const { container } = render(
        <Tabs defaultValue="tab1" className="custom-tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(container.firstChild).toHaveClass("custom-tabs");
    });

    it("should pass through additional props", () => {
      const { container } = render(
        <Tabs defaultValue="tab1" data-testid="tabs-test">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(container.firstChild).toHaveAttribute("data-testid", "tabs-test");
    });

    it("should handle multiple tabs", async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>,
      );

      expect(screen.getByText("Content 1")).toBeInTheDocument();

      await user.click(screen.getByText("Tab 2"));
      await waitFor(() => {
        expect(screen.getByText("Content 2")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Tab 3"));
      await waitFor(() => {
        expect(screen.getByText("Content 3")).toBeInTheDocument();
      });
    });

    it("should render with activationMode prop", () => {
      render(
        <Tabs defaultValue="tab1" activationMode="manual">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByText("Tab 1")).toBeInTheDocument();
    });
  });

  describe("TabsList", () => {
    it("should render tabs list", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const list = screen.getByRole("tablist");
      expect(list).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const list = screen.getByRole("tablist");
      expect(list).toHaveClass("custom-list");
    });

    it("should have default styling classes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const list = screen.getByRole("tablist");
      expect(list).toHaveClass(
        "inline-flex",
        "h-9",
        "items-center",
        "justify-center",
        "rounded-lg",
        "bg-muted",
        "p-1",
        "text-muted-foreground",
      );
    });

    it("should forward ref correctly", () => {
      const ref = { current: null };
      render(
        <Tabs defaultValue="tab1">
          <TabsList ref={ref}>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(ref.current).not.toBeNull();
    });

    it("should pass through additional props", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="list-test">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByTestId("list-test")).toBeInTheDocument();
    });

    it("should render multiple triggers", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByText("Tab 1")).toBeInTheDocument();
      expect(screen.getByText("Tab 2")).toBeInTheDocument();
      expect(screen.getByText("Tab 3")).toBeInTheDocument();
    });

    it("should merge custom className with default classes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="shadow-lg">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const list = screen.getByRole("tablist");
      expect(list).toHaveClass("rounded-lg", "shadow-lg");
    });

    it("should render with children elements", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <div data-testid="custom-child">Custom element</div>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByTestId("custom-child")).toBeInTheDocument();
    });

    it("should render empty list", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList></TabsList>
        </Tabs>,
      );
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });
  });

  describe("TabsTrigger", () => {
    it("should render trigger button", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Click me</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByRole("tab", { name: "Click me" })).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const trigger = screen.getByRole("tab", { name: "Tab 1" });
      expect(trigger).toHaveClass("custom-trigger");
    });

    it("should have default styling classes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const trigger = screen.getByRole("tab", { name: "Tab 1" });
      expect(trigger).toHaveClass(
        "inline-flex",
        "items-center",
        "justify-center",
        "whitespace-nowrap",
        "rounded-md",
        "px-3",
        "py-1",
        "text-sm",
        "font-medium",
      );
    });

    it("should show active state", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Active Tab</TabsTrigger>
            <TabsTrigger value="tab2">Inactive Tab</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const activeTab = screen.getByRole("tab", { name: "Active Tab" });
      expect(activeTab).toHaveAttribute("data-state", "active");
    });

    it("should handle disabled state", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const trigger = screen.getByRole("tab", { name: "Disabled" });
      expect(trigger).toBeDisabled();
    });

    it("should forward ref correctly", () => {
      const ref = { current: null };
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" ref={ref}>
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(ref.current).not.toBeNull();
    });

    it("should pass through additional props", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger-test">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      expect(screen.getByTestId("trigger-test")).toBeInTheDocument();
    });

    it("should merge custom className with default classes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="text-lg">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const trigger = screen.getByRole("tab", { name: "Tab 1" });
      expect(trigger).toHaveClass("rounded-md", "text-lg");
    });

    it("should handle click event", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" onClick={onClick}>
              Tab 2
            </TabsTrigger>
          </TabsList>
        </Tabs>,
      );

      await user.click(screen.getByRole("tab", { name: "Tab 2" }));
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe("TabsContent", () => {
    it("should render content for active tab", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Tab 1 content</TabsContent>
        </Tabs>,
      );
      expect(screen.getByText("Tab 1 content")).toBeInTheDocument();
    });

    it("should not render content for inactive tab", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>,
      );
      expect(screen.getByText("Content 1")).toBeInTheDocument();
      expect(screen.queryByText("Content 2")).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">
            Content
          </TabsContent>
        </Tabs>,
      );
      const content = screen.getByText("Content");
      expect(content).toHaveClass("custom-content");
    });

    it("should have default styling classes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>,
      );
      const content = screen.getByText("Content");
      expect(content).toHaveClass("mt-2", "ring-offset-background");
    });

    it("should forward ref correctly", () => {
      const ref = { current: null };
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" ref={ref}>
            Content
          </TabsContent>
        </Tabs>,
      );
      expect(ref.current).not.toBeNull();
    });

    it("should pass through additional props", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content-test">
            Content
          </TabsContent>
        </Tabs>,
      );
      expect(screen.getByTestId("content-test")).toBeInTheDocument();
    });

    it("should merge custom className with default classes", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="p-4">
            Content
          </TabsContent>
        </Tabs>,
      );
      const content = screen.getByText("Content");
      expect(content).toHaveClass("mt-2", "p-4");
    });

    it("should render complex content", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <div data-testid="complex-child">
              <h2>Title</h2>
              <p>Paragraph</p>
            </div>
          </TabsContent>
        </Tabs>,
      );
      expect(screen.getByTestId("complex-child")).toBeInTheDocument();
      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Paragraph")).toBeInTheDocument();
    });

    it("should update when tab changes", async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">First content</TabsContent>
          <TabsContent value="tab2">Second content</TabsContent>
        </Tabs>,
      );

      expect(screen.getByText("First content")).toBeInTheDocument();
      expect(screen.queryByText("Second content")).not.toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "Tab 2" }));

      await waitFor(() => {
        expect(screen.queryByText("First content")).not.toBeInTheDocument();
        expect(screen.getByText("Second content")).toBeInTheDocument();
      });
    });

    it("should have tabpanel role", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>,
      );
      const content = screen.getByRole("tabpanel");
      expect(content).toBeInTheDocument();
    });
  });

  describe("Tabs Composition", () => {
    it("should render complete tabs with all components", () => {
      render(
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <p>Account settings content</p>
          </TabsContent>
          <TabsContent value="password">
            <p>Password settings content</p>
          </TabsContent>
        </Tabs>,
      );

      expect(screen.getByRole("tablist")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Account" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Password" })).toBeInTheDocument();
      expect(screen.getByText("Account settings content")).toBeInTheDocument();
    });

    it("should handle tab switching in complete composition", async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Overview content</TabsContent>
          <TabsContent value="details">Details content</TabsContent>
          <TabsContent value="settings">Settings content</TabsContent>
        </Tabs>,
      );

      expect(screen.getByText("Overview content")).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "Details" }));
      await waitFor(() => {
        expect(screen.getByText("Details content")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "Settings" }));
      await waitFor(() => {
        expect(screen.getByText("Settings content")).toBeInTheDocument();
      });
    });

    it("should render with custom styling on all components", () => {
      render(
        <Tabs defaultValue="tab1" className="custom-tabs">
          <TabsList className="custom-list">
            <TabsTrigger value="tab1" className="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">
            Content
          </TabsContent>
        </Tabs>,
      );

      const tabs = screen.getByRole("tablist").parentElement;
      expect(tabs).toHaveClass("custom-tabs");
      expect(screen.getByRole("tablist")).toHaveClass("custom-list");
      expect(screen.getByRole("tab")).toHaveClass("custom-trigger");
      expect(screen.getByRole("tabpanel")).toHaveClass("custom-content");
    });
  });
});
