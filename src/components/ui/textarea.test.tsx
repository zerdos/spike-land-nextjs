import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders correctly", () => {
    render(<Textarea placeholder="Type here" />);
    const textarea = screen.getByPlaceholderText("Type here");
    expect(textarea).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Textarea className="custom-class" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("custom-class");
  });

  it("forwards ref", () => {
    const ref = { current: null };
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("handles disabled state", () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass("disabled:cursor-not-allowed", "disabled:opacity-50");
  });

  it("handles user input", async () => {
    const user = userEvent.setup();
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");

    await user.type(textarea, "Hello World");
    expect(textarea).toHaveValue("Hello World");
  });

  it("applies default classes", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass(
      "flex",
      "min-h-[60px]",
      "w-full",
      "rounded-md",
      "border",
      "border-input",
      "bg-transparent",
    );
  });
});
