import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { WelcomeEmail } from "./welcome";

describe("WelcomeEmail", () => {
  it("should render welcome email with user name", async () => {
    const html = await render(
      <WelcomeEmail userName="John Doe" userEmail="john@example.com" />,
    );

    expect(html).toContain("Welcome to Pixel, John Doe!");
    expect(html).toContain("Thank you for joining Pixel");
  });

  it("should use email username when name is not provided", async () => {
    const html = await render(<WelcomeEmail userEmail="john.smith@example.com" />);

    expect(html).toContain("Welcome to Pixel, john.smith!");
  });

  it("should include welcome message and free tokens", async () => {
    const html = await render(
      <WelcomeEmail userName="John" userEmail="john@example.com" />,
    );

    expect(html).toContain("received 5 free tokens");
    expect(html).toContain("AI-powered image enhancement platform");
  });

  it("should list platform features", async () => {
    const html = await render(
      <WelcomeEmail userName="John" userEmail="john@example.com" />,
    );

    expect(html).toContain("Enhance Images");
    expect(html).toContain("AI-Powered Edits");
    expect(html).toContain("Multiple Formats");
    expect(html).toContain("Fast Processing");
  });

  it("should include call-to-action button", async () => {
    const html = await render(
      <WelcomeEmail userName="John" userEmail="john@example.com" />,
    );

    expect(html).toContain("Start Enhancing Images");
    expect(html).toContain("https://spike.land/dashboard");
  });

  it("should include help and support links", async () => {
    const html = await render(
      <WelcomeEmail userName="John" userEmail="john@example.com" />,
    );

    expect(html).toContain("documentation");
    expect(html).toContain("contact support");
    expect(html).toContain("https://spike.land/docs");
    expect(html).toContain("https://spike.land/support");
  });

  it("should include team signature", async () => {
    const html = await render(
      <WelcomeEmail userName="John" userEmail="john@example.com" />,
    );

    expect(html).toContain("Happy enhancing!");
    expect(html).toContain("The Pixel Team");
  });

  it("should handle empty user name gracefully", async () => {
    const html = await render(<WelcomeEmail userName="" userEmail="test@example.com" />);

    expect(html).toContain("Welcome to Pixel, test!");
  });
});
