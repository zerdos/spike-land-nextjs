import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FAQSection } from "./faq-section";

// Mock window.scrollTo
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("FAQSection", () => {
  it("renders the FAQ section with title", () => {
    render(<FAQSection />);
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
    expect(screen.getByText("Everything you need to know about our AI development services and process.")).toBeInTheDocument();
  });

  it("renders all questions", () => {
    render(<FAQSection />);
    expect(screen.getByText("What AI development services do you offer?")).toBeInTheDocument();
    expect(screen.getByText("How much does a typical project cost?")).toBeInTheDocument();
    expect(screen.getByText("What is the typical timeline for an AI project?")).toBeInTheDocument();
    expect(screen.getByText("Do you provide ongoing support and maintenance?")).toBeInTheDocument();
    expect(screen.getByText("How do you ensure data privacy and security?")).toBeInTheDocument();
  });

  it("toggles answer visibility on click", async () => {
    render(<FAQSection />);

    const question = screen.getByText("What AI development services do you offer?");
    const answerText = "We specialize in building custom AI agents, intelligent chatbots, and process automation solutions tailored to your business needs. Our team leverages cutting-edge LLMs and robust engineering to deliver scalable and secure AI applications.";

    // Initially, answer should not be in document
    expect(screen.queryByText(answerText)).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(question);

    // Should be present now
    await waitFor(() => {
      expect(screen.getByText(answerText)).toBeInTheDocument();
    });
  });
});
