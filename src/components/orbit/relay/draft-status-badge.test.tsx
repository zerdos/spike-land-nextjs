import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DraftStatusBadge } from "./draft-status-badge";

describe("DraftStatusBadge", () => {
  it("renders PENDING status correctly", () => {
    render(<DraftStatusBadge status="PENDING" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders APPROVED status correctly", () => {
    render(<DraftStatusBadge status="APPROVED" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("renders REJECTED status correctly", () => {
    render(<DraftStatusBadge status="REJECTED" />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders SENT status correctly", () => {
    render(<DraftStatusBadge status="SENT" />);
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("renders FAILED status correctly", () => {
    render(<DraftStatusBadge status="FAILED" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DraftStatusBadge status="PENDING" className="custom-class" />,
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("has the correct test id", () => {
    render(<DraftStatusBadge status="PENDING" />);
    expect(screen.getByTestId("draft-status-badge")).toBeInTheDocument();
  });
});
