import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
  });

  describe("TabsList", () => {
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
        "relative",
        "inline-flex",
        "h-11",
        "items-center",
        "justify-center",
        "rounded-xl",
        "bg-muted/30",
        "p-1",
        "text-muted-foreground/60",
        "glass-0",
      );
    });
  });

  describe("TabsTrigger", () => {
    it("should show active state with enhanced visual distinction", () => {
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
      expect(activeTab).toHaveClass(
        "data-[state=active]:text-primary",
        "data-[state=active]:font-semibold",
      );
    });

    it("should have improved visual distinction classes for inactive tabs", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Active Tab</TabsTrigger>
            <TabsTrigger value="tab2">Inactive Tab</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const inactiveTab = screen.getByRole("tab", { name: "Inactive Tab" });
      // Verify improved opacity (70% instead of 30%)
      expect(inactiveTab).toHaveClass("text-muted-foreground/70");
      // Verify hover states are present
      expect(inactiveTab).toHaveClass("hover:text-muted-foreground");
      expect(inactiveTab).toHaveClass("hover:bg-white/5");
    });

    it("should have minimum tap target size for accessibility", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const tab = screen.getByRole("tab");
      // WCAG requires minimum 44px tap target for mobile
      expect(tab).toHaveClass("min-h-[44px]");
    });

    it("should support keyboard navigation", async () => {
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

      const tab1 = screen.getByRole("tab", { name: "Tab 1" });
      const tab2 = screen.getByRole("tab", { name: "Tab 2" });
      const tab3 = screen.getByRole("tab", { name: "Tab 3" });

      // Focus on first tab
      await user.click(tab1);
      expect(tab1).toHaveAttribute("data-state", "active");

      // Arrow right should move focus to next tab
      await user.keyboard("{ArrowRight}");
      expect(tab2).toHaveFocus();

      // Enter/Space to activate
      await user.keyboard("{Enter}");
      await waitFor(() => {
        expect(tab2).toHaveAttribute("data-state", "active");
      });

      // Arrow right again
      await user.keyboard("{ArrowRight}");
      expect(tab3).toHaveFocus();

      // Arrow left to go back
      await user.keyboard("{ArrowLeft}");
      expect(tab2).toHaveFocus();
    });

    it("should have proper ARIA attributes via Radix", () => {
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

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);

      // Active tab should have aria-selected
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
      expect(tabs[1]).toHaveAttribute("aria-selected", "false");

      // Tab panel should be linked to trigger
      const tabPanel = screen.getByRole("tabpanel");
      expect(tabPanel).toHaveAttribute("aria-labelledby");
    });

    it("should have focus-visible ring styles for accessibility", () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
      const tab = screen.getByRole("tab");
      expect(tab).toHaveClass("focus-visible:ring-2");
      expect(tab).toHaveClass("focus-visible:ring-ring");
      expect(tab).toHaveClass("focus-visible:ring-offset-2");
    });
  });
});
