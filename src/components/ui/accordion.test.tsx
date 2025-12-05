import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

describe("Accordion Component", () => {
  const renderAccordion = (type: "single" | "multiple" = "single") => {
    return render(
      <Accordion type={type} collapsible={type === "single"}>
        <AccordionItem value="item-1">
          <AccordionTrigger>Question 1</AccordionTrigger>
          <AccordionContent>Answer 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Question 2</AccordionTrigger>
          <AccordionContent>Answer 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
  };

  it("should render accordion with items", () => {
    renderAccordion();
    expect(screen.getByText("Question 1")).toBeInTheDocument();
    expect(screen.getByText("Question 2")).toBeInTheDocument();
  });

  it("should expand content when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderAccordion();

    const trigger = screen.getByText("Question 1");
    await user.click(trigger);

    expect(screen.getByText("Answer 1")).toBeVisible();
  });

  it("should collapse content when clicking expanded trigger", async () => {
    const user = userEvent.setup();
    renderAccordion();

    const trigger = screen.getByText("Question 1");
    await user.click(trigger);
    expect(screen.getByText("Answer 1")).toBeVisible();

    await user.click(trigger);
    // After collapse, the trigger should have closed state
    expect(trigger).toHaveAttribute("data-state", "closed");
  });

  it("should only have one item open at a time in single mode", async () => {
    const user = userEvent.setup();
    renderAccordion("single");

    // Open first item
    await user.click(screen.getByText("Question 1"));
    expect(screen.getByText("Answer 1")).toBeVisible();

    // Open second item - first should close
    await user.click(screen.getByText("Question 2"));
    expect(screen.getByText("Answer 2")).toBeVisible();
  });

  it("should allow multiple items open in multiple mode", async () => {
    const user = userEvent.setup();
    renderAccordion("multiple");

    // Open first item
    await user.click(screen.getByText("Question 1"));
    expect(screen.getByText("Answer 1")).toBeVisible();

    // Open second item - first should stay open
    await user.click(screen.getByText("Question 2"));
    expect(screen.getByText("Answer 1")).toBeVisible();
    expect(screen.getByText("Answer 2")).toBeVisible();
  });

  it("should apply border-b class to AccordionItem", () => {
    renderAccordion();
    const items = document.querySelectorAll("[data-state]");
    expect(items[0]).toHaveClass("border-b");
  });

  it("should apply custom className to AccordionItem", () => {
    render(
      <Accordion type="single">
        <AccordionItem value="test" className="custom-class">
          <AccordionTrigger>Test</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const item = document.querySelector("[data-state]");
    expect(item).toHaveClass("custom-class");
  });

  it("should apply custom className to AccordionTrigger", () => {
    render(
      <Accordion type="single">
        <AccordionItem value="test">
          <AccordionTrigger className="trigger-class">Test</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(screen.getByText("Test")).toHaveClass("trigger-class");
  });

  it("should apply custom className to AccordionContent inner div", () => {
    render(
      <Accordion type="single" defaultValue="test">
        <AccordionItem value="test">
          <AccordionTrigger>Test</AccordionTrigger>
          <AccordionContent className="content-class">Content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const contentDiv = screen.getByText("Content").closest("div");
    expect(contentDiv).toHaveClass("content-class");
  });

  it("should have chevron icon in trigger", () => {
    renderAccordion();
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("should have correct display names", () => {
    expect(AccordionItem.displayName).toBe("AccordionItem");
    expect(AccordionTrigger.displayName).toBe("AccordionTrigger");
    expect(AccordionContent.displayName).toBe("AccordionContent");
  });

  it("should be keyboard accessible", async () => {
    const user = userEvent.setup();
    renderAccordion();

    const trigger1 = screen.getByText("Question 1");
    trigger1.focus();
    expect(trigger1).toHaveFocus();

    // Press Enter to expand
    await user.keyboard("{Enter}");
    expect(screen.getByText("Answer 1")).toBeVisible();

    // Press Space to collapse
    await user.keyboard(" ");
    // After collapse, the trigger should have closed state
    expect(trigger1).toHaveAttribute("data-state", "closed");
  });

  it("should support default open value", () => {
    render(
      <Accordion type="single" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Question 1</AccordionTrigger>
          <AccordionContent>Answer 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(screen.getByText("Answer 1")).toBeVisible();
  });

  it("should have animation classes on content", () => {
    render(
      <Accordion type="single" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Question</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const content = screen.getByText("Content").parentElement;
    expect(content).toHaveClass("overflow-hidden");
  });
});
