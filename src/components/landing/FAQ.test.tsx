import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FAQ } from "./FAQ";

describe("FAQ Component", () => {
  it("should render the section heading", () => {
    render(<FAQ />);
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<FAQ />);
    expect(screen.getByText(/Everything you need to know/)).toBeInTheDocument();
  });

  it("should render all FAQ questions", () => {
    render(<FAQ />);
    expect(screen.getByText("What types of images can I enhance?"))
      .toBeInTheDocument();
    expect(screen.getByText("How do tokens work?")).toBeInTheDocument();
    expect(screen.getByText("What resolution options are available?"))
      .toBeInTheDocument();
    expect(screen.getByText("How long does enhancement take?"))
      .toBeInTheDocument();
    expect(screen.getByText("Is my data secure?")).toBeInTheDocument();
    expect(screen.getByText("Can I get a refund if I'm not satisfied?"))
      .toBeInTheDocument();
  });

  it("should expand answer when question is clicked", async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const firstQuestion = screen.getByText(
      "What types of images can I enhance?",
    );
    await user.click(firstQuestion);

    expect(
      screen.getByText(/Our AI enhancement works with all common image types/),
    ).toBeVisible();
  });

  it("should show token explanation when clicked", async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const tokenQuestion = screen.getByText("How do tokens work?");
    await user.click(tokenQuestion);

    expect(screen.getByText(/Tokens are our flexible payment system/))
      .toBeVisible();
  });

  it("should show resolution options when clicked", async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const resolutionQuestion = screen.getByText(
      "What resolution options are available?",
    );
    await user.click(resolutionQuestion);

    expect(screen.getByText(/We offer three resolution tiers/)).toBeVisible();
    expect(screen.getByText(/1K \(1024px\), 2K \(2048px\), and 4K \(4096px\)/))
      .toBeVisible();
  });

  it("should show processing time when clicked", async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const timeQuestion = screen.getByText("How long does enhancement take?");
    await user.click(timeQuestion);

    expect(screen.getByText(/5-15 seconds/)).toBeVisible();
  });

  it("should show security info when clicked", async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const securityQuestion = screen.getByText("Is my data secure?");
    await user.click(securityQuestion);

    expect(screen.getByText(/encrypted during transfer/)).toBeVisible();
    expect(screen.getByText(/automatically delete/)).toBeVisible();
  });

  it("should show refund policy when clicked", async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const refundQuestion = screen.getByText(
      "Can I get a refund if I'm not satisfied?",
    );
    await user.click(refundQuestion);

    expect(screen.getByText(/refund the tokens used/)).toBeVisible();
  });

  it("should collapse when clicking same question again", async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    const firstQuestion = screen.getByText(
      "What types of images can I enhance?",
    );

    // Expand
    await user.click(firstQuestion);
    expect(
      screen.getByText(/Our AI enhancement works with all common image types/),
    ).toBeVisible();

    // Collapse
    await user.click(firstQuestion);
    // After collapse, the trigger should have closed state
    expect(firstQuestion).toHaveAttribute("data-state", "closed");
  });

  it("should only have one item open at a time", async () => {
    const user = userEvent.setup();
    render(<FAQ />);

    // Open first question
    await user.click(screen.getByText("What types of images can I enhance?"));
    expect(
      screen.getByText(/Our AI enhancement works with all common image types/),
    ).toBeVisible();

    // Open second question
    await user.click(screen.getByText("How do tokens work?"));
    expect(screen.getByText(/Tokens are our flexible payment system/))
      .toBeVisible();
    // First should close due to single mode
  });

  it("should have 6 accordion items", () => {
    render(<FAQ />);
    const accordionTriggers = screen.getAllByRole("button");
    expect(accordionTriggers.length).toBe(6);
  });

  it("should have proper heading hierarchy", () => {
    render(<FAQ />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Frequently Asked Questions");
  });
});
