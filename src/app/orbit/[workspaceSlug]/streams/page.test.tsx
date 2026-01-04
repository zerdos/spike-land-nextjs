import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StreamsPage from "./page";

// Mock the StreamsClient component
vi.mock("./StreamsClient", () => ({
  StreamsClient: () => <div data-testid="mock-streams-client">StreamsClient Mock</div>,
}));

describe("StreamsPage", () => {
  it("renders StreamsClient component", () => {
    render(<StreamsPage />);

    expect(screen.getByTestId("mock-streams-client")).toBeInTheDocument();
    expect(screen.getByText("StreamsClient Mock")).toBeInTheDocument();
  });
});
