import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Input } from "./input";

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
});

function TestForm({ onSubmit }: { onSubmit?: (values: z.infer<typeof formSchema>) => void; }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  function handleSubmit(values: z.infer<typeof formSchema>) {
    onSubmit?.(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

describe("Form", () => {
  it("renders form components correctly", () => {
    render(<TestForm />);

    expect(screen.getByText("Username")).toBeInTheDocument(); // Label
    expect(screen.getByPlaceholderText("shadcn")).toBeInTheDocument(); // Input
    expect(screen.getByText("This is your public display name.")).toBeInTheDocument(); // Description
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("displays error message on invalid submission", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const submitButton = screen.getByRole("button", { name: "Submit" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Username must be at least 2 characters.")).toBeInTheDocument();
    });
  });

  it("applies error styling to label and attributes to input", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const submitButton = screen.getByRole("button", { name: "Submit" });
    await user.click(submitButton);

    await waitFor(() => {
      const label = screen.getByText("Username");
      expect(label).toHaveClass("text-destructive");

      const input = screen.getByPlaceholderText("shadcn");
      expect(input).toHaveAttribute("aria-invalid", "true");
      // aria-describedby should include both description and message IDs
      const describedBy = input.getAttribute("aria-describedby");
      expect(describedBy).toContain("form-item-description");
      expect(describedBy).toContain("form-item-message");
    });
  });

  it("successfully submits valid data", async () => {
    const user = userEvent.setup();
    let submittedValues = null;
    const handleSubmit = (values: any) => {
      submittedValues = values;
    };

    render(<TestForm onSubmit={handleSubmit} />);

    const input = screen.getByPlaceholderText("shadcn");
    await user.type(input, "jules");

    const submitButton = screen.getByRole("button", { name: "Submit" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submittedValues).toEqual({ username: "jules" });
    });

    // Error message should not be present
    expect(screen.queryByText("Username must be at least 2 characters.")).not.toBeInTheDocument();
  });
});
