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
      expect(activeTab).toHaveClass(
        "data-[state=active]:text-primary",
        "data-[state=active]:font-bold",
      );
    });
  });
});
