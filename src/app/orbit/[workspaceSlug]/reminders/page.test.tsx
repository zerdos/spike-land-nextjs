import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RemindersPage from "./page";

describe("RemindersPage", () => {
  it("renders page title", () => {
    render(<RemindersPage />);
    expect(screen.getByText("Reminders")).toBeInTheDocument();
  });
});
