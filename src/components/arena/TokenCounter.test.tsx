import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TokenCounter } from "./TokenCounter";

describe("TokenCounter", () => {
  it("shows 0 tokens for empty text", () => {
    render(<TokenCounter text="" />);
    expect(screen.getByText("~0 tokens")).toBeInTheDocument();
  });

  it("estimates tokens at ~4 chars per token", () => {
    render(<TokenCounter text="Hello World!!" />); // 13 chars = ~4 tokens
    expect(screen.getByText("~4 tokens")).toBeInTheDocument();
  });

  it("handles longer text", () => {
    const text = "a".repeat(400); // 400 chars = 100 tokens
    render(<TokenCounter text={text} />);
    expect(screen.getByText("~100 tokens")).toBeInTheDocument();
  });

  it("rounds up partial tokens", () => {
    render(<TokenCounter text="Hi" />); // 2 chars = ceil(0.5) = 1 token
    expect(screen.getByText("~1 tokens")).toBeInTheDocument();
  });
});
