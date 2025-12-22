import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("RadioGroup", () => {
  it("renders correctly", () => {
    render(
      <RadioGroup defaultValue="option-one">
        <RadioGroupItem value="option-one" id="option-one" />
        <RadioGroupItem value="option-two" id="option-two" />
      </RadioGroup>
    );
    const radioGroup = screen.getByRole("radiogroup");
    expect(radioGroup).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("handles default value", () => {
    render(
      <RadioGroup defaultValue="option-two">
        <RadioGroupItem value="option-one" id="option-one" />
        <RadioGroupItem value="option-two" id="option-two" />
      </RadioGroup>
    );
    // Radix UI radio items have role="radio"
    const radios = screen.getAllByRole("radio");
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  it("handles value change interaction", async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup defaultValue="option-one">
        <RadioGroupItem value="option-one" id="option-one" />
        <RadioGroupItem value="option-two" id="option-two" />
      </RadioGroup>
    );

    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toBeChecked();

    await user.click(radios[1]);
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  it("applies custom className", () => {
    render(
      <RadioGroup className="custom-group">
        <RadioGroupItem value="test" className="custom-item" />
      </RadioGroup>
    );
    expect(screen.getByRole("radiogroup")).toHaveClass("custom-group");
    expect(screen.getByRole("radio")).toHaveClass("custom-item");
  });

  it("handles disabled state", () => {
    render(
      <RadioGroup disabled>
        <RadioGroupItem value="option-one" />
        <RadioGroupItem value="option-two" />
      </RadioGroup>
    );
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toBeDisabled();
    expect(radios[1]).toBeDisabled();
  });

  it("handles disabled item", () => {
    render(
      <RadioGroup>
        <RadioGroupItem value="option-one" disabled />
        <RadioGroupItem value="option-two" />
      </RadioGroup>
    );
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toBeDisabled();
    expect(radios[1]).not.toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = { current: null };
    render(
      <RadioGroup ref={ref}>
        <RadioGroupItem value="1" />
      </RadioGroup>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
