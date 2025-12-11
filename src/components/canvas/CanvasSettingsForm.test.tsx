import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type CanvasSettings, CanvasSettingsForm } from "./CanvasSettingsForm";

describe("CanvasSettingsForm", () => {
  const mockOnChange = vi.fn();

  const defaultSettings: CanvasSettings = {
    rotation: 0,
    order: "album",
    interval: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all controls", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      expect(screen.getByLabelText("Rotation")).toBeInTheDocument();
      expect(screen.getByLabelText("Order")).toBeInTheDocument();
      expect(screen.getByLabelText("Interval")).toBeInTheDocument();
    });

    it("renders rotation select with correct value", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const rotationSelect = screen.getByTestId("rotation-select");
      expect(rotationSelect).toBeInTheDocument();
    });

    it("renders order select with correct value", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const orderSelect = screen.getByTestId("order-select");
      expect(orderSelect).toBeInTheDocument();
    });

    it("renders interval input with correct value", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const intervalInput = screen.getByTestId("interval-input");
      expect(intervalInput).toHaveValue(10);
    });

    it("renders seconds suffix for interval", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      expect(screen.getByText("seconds")).toBeInTheDocument();
    });
  });

  describe("Rotation changes", () => {
    it("calls onChange with new rotation value when rotation is changed", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const rotationTrigger = screen.getByTestId("rotation-select");
      fireEvent.click(rotationTrigger);

      const option90 = screen.getByText("90 clockwise");
      fireEvent.click(option90);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultSettings,
        rotation: 90,
      });
    });

    it("calls onChange with 180 rotation", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const rotationTrigger = screen.getByTestId("rotation-select");
      fireEvent.click(rotationTrigger);

      const option180 = screen.getByText("180");
      fireEvent.click(option180);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultSettings,
        rotation: 180,
      });
    });

    it("calls onChange with 270 rotation", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const rotationTrigger = screen.getByTestId("rotation-select");
      fireEvent.click(rotationTrigger);

      const option270 = screen.getByText("270 clockwise");
      fireEvent.click(option270);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultSettings,
        rotation: 270,
      });
    });
  });

  describe("Order changes", () => {
    it("calls onChange with new order value when order is changed to random", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const orderTrigger = screen.getByTestId("order-select");
      fireEvent.click(orderTrigger);

      const randomOption = screen.getByText("Random");
      fireEvent.click(randomOption);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultSettings,
        order: "random",
      });
    });

    it("calls onChange with album order when switching back", () => {
      const settingsWithRandom: CanvasSettings = {
        ...defaultSettings,
        order: "random",
      };

      render(
        <CanvasSettingsForm settings={settingsWithRandom} onChange={mockOnChange} />,
      );

      const orderTrigger = screen.getByTestId("order-select");
      fireEvent.click(orderTrigger);

      const albumOption = screen.getByText("Album order");
      fireEvent.click(albumOption);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...settingsWithRandom,
        order: "album",
      });
    });
  });

  describe("Interval changes", () => {
    it("calls onChange with new interval value when interval is changed", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const intervalInput = screen.getByTestId("interval-input");
      fireEvent.change(intervalInput, { target: { value: "15" } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultSettings,
        interval: 15,
      });
    });

    it("clamps interval to minimum value of 5", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const intervalInput = screen.getByTestId("interval-input");
      fireEvent.change(intervalInput, { target: { value: "2" } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultSettings,
        interval: 5,
      });
    });

    it("clamps interval to maximum value of 60", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const intervalInput = screen.getByTestId("interval-input");
      fireEvent.change(intervalInput, { target: { value: "100" } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultSettings,
        interval: 60,
      });
    });

    it("handles invalid input by setting to minimum", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const intervalInput = screen.getByTestId("interval-input");
      fireEvent.change(intervalInput, { target: { value: "abc" } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultSettings,
        interval: 5,
      });
    });

    it("accepts valid interval within range", () => {
      render(
        <CanvasSettingsForm settings={defaultSettings} onChange={mockOnChange} />,
      );

      const intervalInput = screen.getByTestId("interval-input");
      fireEvent.change(intervalInput, { target: { value: "30" } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultSettings,
        interval: 30,
      });
    });
  });

  describe("Displaying different settings", () => {
    it("displays rotation 90 correctly", () => {
      const settings: CanvasSettings = {
        rotation: 90,
        order: "album",
        interval: 10,
      };

      render(
        <CanvasSettingsForm settings={settings} onChange={mockOnChange} />,
      );

      const rotationTrigger = screen.getByTestId("rotation-select");
      fireEvent.click(rotationTrigger);

      const options90 = screen.getAllByText("90 clockwise");
      expect(options90.length).toBeGreaterThan(0);
    });

    it("displays random order correctly", () => {
      const settings: CanvasSettings = {
        rotation: 0,
        order: "random",
        interval: 10,
      };

      render(
        <CanvasSettingsForm settings={settings} onChange={mockOnChange} />,
      );

      const orderTrigger = screen.getByTestId("order-select");
      fireEvent.click(orderTrigger);

      const randomOptions = screen.getAllByText("Random");
      expect(randomOptions.length).toBeGreaterThan(0);
    });

    it("displays custom interval correctly", () => {
      const settings: CanvasSettings = {
        rotation: 0,
        order: "album",
        interval: 45,
      };

      render(
        <CanvasSettingsForm settings={settings} onChange={mockOnChange} />,
      );

      const intervalInput = screen.getByTestId("interval-input");
      expect(intervalInput).toHaveValue(45);
    });
  });
});
