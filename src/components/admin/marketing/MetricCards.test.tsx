import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricCard, MetricCardData, MetricCards } from "./MetricCards";

describe("MetricCard", () => {
  const baseMetric: MetricCardData = {
    title: "Visitors",
    value: 1234,
  };

  it("renders metric title and value", () => {
    render(<MetricCard metric={baseMetric} />);

    expect(screen.getByText("Visitors")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders string value without formatting", () => {
    const metric: MetricCardData = {
      title: "Rate",
      value: "25.5%",
    };
    render(<MetricCard metric={metric} />);

    expect(screen.getByText("25.5%")).toBeInTheDocument();
  });

  it("renders positive change badge", () => {
    const metric: MetricCardData = {
      title: "Revenue",
      value: 5000,
      change: 15.5,
    };
    render(<MetricCard metric={metric} />);

    expect(screen.getByText("+15.5%")).toBeInTheDocument();
  });

  it("renders negative change badge", () => {
    const metric: MetricCardData = {
      title: "Signups",
      value: 100,
      change: -8.2,
    };
    render(<MetricCard metric={metric} />);

    expect(screen.getByText("-8.2%")).toBeInTheDocument();
  });

  it("renders zero change badge", () => {
    const metric: MetricCardData = {
      title: "Neutral",
      value: 50,
      change: 0,
    };
    render(<MetricCard metric={metric} />);

    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  it("renders change label", () => {
    const metric: MetricCardData = {
      title: "Test",
      value: 123,
      changeLabel: "vs previous period",
    };
    render(<MetricCard metric={metric} />);

    expect(screen.getByText("vs previous period")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    render(<MetricCard metric={baseMetric} loading />);

    expect(screen.queryByText("Visitors")).not.toBeInTheDocument();
    // The loading state renders skeleton divs
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    const metric: MetricCardData = {
      title: "Test",
      value: 123,
      icon: <span data-testid="icon">Icon</span>,
    };
    render(<MetricCard metric={metric} />);

    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});

describe("MetricCards", () => {
  const metrics: MetricCardData[] = [
    { title: "Metric 1", value: 100 },
    { title: "Metric 2", value: 200 },
    { title: "Metric 3", value: 300 },
    { title: "Metric 4", value: 400 },
  ];

  it("renders multiple metric cards", () => {
    render(<MetricCards metrics={metrics} />);

    expect(screen.getByText("Metric 1")).toBeInTheDocument();
    expect(screen.getByText("Metric 2")).toBeInTheDocument();
    expect(screen.getByText("Metric 3")).toBeInTheDocument();
    expect(screen.getByText("Metric 4")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <MetricCards metrics={metrics} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders loading state for all cards", () => {
    render(<MetricCards metrics={metrics} loading />);

    expect(screen.queryByText("Metric 1")).not.toBeInTheDocument();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
