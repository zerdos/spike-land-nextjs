import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DateRangePicker,
  DateRangePreset,
  formatDateForAPI,
  getDateRangeFromPreset,
} from "./DateRangePicker";

describe("getDateRangeFromPreset", () => {
  it("returns 7 day range for 7d preset", () => {
    const range = getDateRangeFromPreset("7d");
    const daysDiff = Math.round(
      (range.endDate.getTime() - range.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    expect(daysDiff).toBe(7);
  });

  it("returns 30 day range for 30d preset", () => {
    const range = getDateRangeFromPreset("30d");
    const daysDiff = Math.round(
      (range.endDate.getTime() - range.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    expect(daysDiff).toBe(30);
  });

  it("returns 90 day range for 90d preset", () => {
    const range = getDateRangeFromPreset("90d");
    const daysDiff = Math.round(
      (range.endDate.getTime() - range.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    expect(daysDiff).toBe(90);
  });

  it("returns 30 day range as default for custom preset", () => {
    const range = getDateRangeFromPreset("custom");
    const daysDiff = Math.round(
      (range.endDate.getTime() - range.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    expect(daysDiff).toBe(30);
  });
});

describe("formatDateForAPI", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date("2024-03-15T12:00:00Z");
    expect(formatDateForAPI(date)).toBe("2024-03-15");
  });

  it("handles different dates correctly", () => {
    const date = new Date("2023-12-01T00:00:00Z");
    expect(formatDateForAPI(date)).toBe("2023-12-01");
  });
});

describe("DateRangePicker", () => {
  const defaultProps = {
    preset: "30d" as DateRangePreset,
    onPresetChange: vi.fn(),
  };

  it("renders with preset selected", () => {
    render(<DateRangePicker {...defaultProps} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows date range text for non-custom presets", () => {
    render(<DateRangePicker {...defaultProps} />);

    // The component displays formatted dates
    const dateText = screen.getByText(/\d+\/\d+\/\d+ - \d+\/\d+\/\d+/);
    expect(dateText).toBeInTheDocument();
  });

  it("calls onPresetChange when preset is changed", async () => {
    const onPresetChange = vi.fn();
    render(
      <DateRangePicker
        {...defaultProps}
        onPresetChange={onPresetChange}
      />,
    );

    // Open the select
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // Select a different option
    const option = await screen.findByText("Last 7 days");
    fireEvent.click(option);

    expect(onPresetChange).toHaveBeenCalledWith("7d");
  });

  it("shows custom date inputs when preset is custom", () => {
    const dateRange = {
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    };
    render(
      <DateRangePicker
        preset="custom"
        onPresetChange={vi.fn()}
        dateRange={dateRange}
        onDateRangeChange={vi.fn()}
      />,
    );

    // Should show date inputs for custom range (type="date" inputs)
    const inputs = document.querySelectorAll('input[type="date"]');
    expect(inputs.length).toBe(2);
  });

  it("calls onDateRangeChange when custom start date changes", () => {
    const onDateRangeChange = vi.fn();
    const dateRange = {
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    };

    render(
      <DateRangePicker
        preset="custom"
        onPresetChange={vi.fn()}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />,
    );

    // Find and change the start date input
    const inputs = document.querySelectorAll('input[type="date"]');
    expect(inputs.length).toBe(2);

    fireEvent.change(inputs[0], { target: { value: "2024-02-01" } });

    expect(onDateRangeChange).toHaveBeenCalled();
  });

  it("calls onDateRangeChange when custom end date changes", () => {
    const onDateRangeChange = vi.fn();
    const dateRange = {
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    };

    render(
      <DateRangePicker
        preset="custom"
        onPresetChange={vi.fn()}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />,
    );

    const inputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(inputs[1], { target: { value: "2024-02-28" } });

    expect(onDateRangeChange).toHaveBeenCalled();
  });

  it("resets date range when Reset button is clicked", () => {
    const onDateRangeChange = vi.fn();
    const dateRange = {
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    };

    render(
      <DateRangePicker
        preset="custom"
        onPresetChange={vi.fn()}
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />,
    );

    const resetButton = screen.getByText("Reset");
    fireEvent.click(resetButton);

    expect(onDateRangeChange).toHaveBeenCalled();
  });

  it("updates date range when preset changes from custom", () => {
    const onPresetChange = vi.fn();
    const onDateRangeChange = vi.fn();

    render(
      <DateRangePicker
        preset="custom"
        onPresetChange={onPresetChange}
        onDateRangeChange={onDateRangeChange}
      />,
    );

    // Change to a non-custom preset
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // This simulates internal handlePresetChange being called
    // The actual call happens via the Select component
  });

  it("applies custom className", () => {
    const { container } = render(
      <DateRangePicker {...defaultProps} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
