/**
 * Tests for OrderStatusBadge component
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderStatusBadge } from "./order-status-badge";

describe("OrderStatusBadge", () => {
  it("should render PENDING status correctly", () => {
    render(<OrderStatusBadge status="PENDING" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("should render PAYMENT_PENDING status correctly", () => {
    render(<OrderStatusBadge status="PAYMENT_PENDING" />);
    expect(screen.getByText("Awaiting Payment")).toBeInTheDocument();
  });

  it("should render PAID status correctly", () => {
    render(<OrderStatusBadge status="PAID" />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("should render SUBMITTED status correctly", () => {
    render(<OrderStatusBadge status="SUBMITTED" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("should render IN_PRODUCTION status correctly", () => {
    render(<OrderStatusBadge status="IN_PRODUCTION" />);
    expect(screen.getByText("In Production")).toBeInTheDocument();
  });

  it("should render SHIPPED status correctly", () => {
    render(<OrderStatusBadge status="SHIPPED" />);
    expect(screen.getByText("Shipped")).toBeInTheDocument();
  });

  it("should render DELIVERED status correctly", () => {
    render(<OrderStatusBadge status="DELIVERED" />);
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("should render CANCELLED status correctly", () => {
    render(<OrderStatusBadge status="CANCELLED" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("should render REFUNDED status correctly", () => {
    render(<OrderStatusBadge status="REFUNDED" />);
    expect(screen.getByText("Refunded")).toBeInTheDocument();
  });

  it("should hide icon when showIcon is false", () => {
    const { container } = render(
      <OrderStatusBadge status="SHIPPED" showIcon={false} />,
    );
    // Icon is typically an SVG, so check there are no SVGs
    expect(container.querySelector("svg")).toBeNull();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <OrderStatusBadge status="PENDING" className="custom-class" />,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should fallback to PENDING for unknown status", () => {
    // @ts-expect-error - testing unknown status handling
    render(<OrderStatusBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
