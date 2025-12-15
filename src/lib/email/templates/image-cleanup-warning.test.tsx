import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { ImageCleanupWarningEmail } from "./image-cleanup-warning";

describe("ImageCleanupWarningEmail", () => {
  const defaultProps = {
    userName: "John Doe",
    userEmail: "john@example.com",
    imageCount: 15,
    deletionDate: "March 15, 2025",
  };

  it("render cleanup warning with user name", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("Hi");
    expect(html).toContain("John Doe");
    expect(html).toContain("Image Retention Reminder");
  });

  it("use email username when name is not provided", async () => {
    const html = await render(
      <ImageCleanupWarningEmail
        {...defaultProps}
        userName={undefined}
        userEmail="jane.smith@example.com"
      />,
    );

    expect(html).toContain("Hi");
    expect(html).toContain("jane.smith");
  });

  it("display image count and deletion date with plural", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("15 images");
    expect(html).toContain("scheduled for automatic deletion");
    expect(html).toContain("March 15, 2025");
  });

  it("use singular form for 1 image", async () => {
    const html = await render(
      <ImageCleanupWarningEmail {...defaultProps} imageCount={1} />,
    );

    expect(html).toContain("1");
    expect(html).toContain("image");
    expect(html).toContain("scheduled");
  });

  it("explain 90-day retention policy", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("90-day image retention policy");
    expect(html).toContain(
      "automatically remove images that are older than 90 days",
    );
  });

  it("provide action items for users", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("Download your images");
    expect(html).toContain("Re-enhance if needed");
    expect(html).toContain("Use your own storage");
  });

  it("include view images button", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("View My Images");
    expect(html).toContain("https://spike.land/images");
  });

  it("warn about permanent deletion", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("Once images are deleted, they cannot be recovered");
  });

  it("mention ability to re-upload", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("you can always upload and enhance them again");
  });

  it("include support link", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("Contact our support team");
    expect(html).toContain("https://spike.land/support");
  });

  it("include team signature", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("Best regards");
    expect(html).toContain("The Spike Land Team");
  });

  it("include unsubscribe link when provided", async () => {
    const html = await render(
      <ImageCleanupWarningEmail
        {...defaultProps}
        unsubscribeUrl="https://spike.land/unsubscribe?token=xyz789"
      />,
    );

    expect(html).toContain("Unsubscribe");
    expect(html).toContain("https://spike.land/unsubscribe?token=xyz789");
  });

  it("not include unsubscribe link when not provided", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).not.toContain("Unsubscribe");
  });

  it("handle large image counts", async () => {
    const html = await render(
      <ImageCleanupWarningEmail {...defaultProps} imageCount={1000} />,
    );

    expect(html).toContain("1000 images");
  });

  it("reference deletion date in action section", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("before");
    expect(html).toContain("March 15, 2025");
  });

  it("explain storage cost rationale", async () => {
    const html = await render(<ImageCleanupWarningEmail {...defaultProps} />);

    expect(html).toContain("manage storage costs");
    expect(html).toContain("maintain platform performance");
  });
});
