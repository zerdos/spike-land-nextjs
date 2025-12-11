/**
 * Tests for Sitemap Preview Client Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SitemapPreviewClient } from "./SitemapPreviewClient";

describe("SitemapPreviewClient", () => {
  const defaultSitemapUrls = [
    "https://spike.land/",
    "https://spike.land/pricing",
    "https://spike.land/apps",
  ];
  const defaultTrackedUrls: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all sitemap URLs", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    expect(screen.getByText("/")).toBeInTheDocument();
    expect(screen.getByText("/pricing")).toBeInTheDocument();
    expect(screen.getByText("/apps")).toBeInTheDocument();
  });

  it("should show loading status badges", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    expect(screen.getByText(/0 \/ 3 loaded/)).toBeInTheDocument();
  });

  it("should render Add URL button", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    expect(screen.getByRole("button", { name: "Add URL" })).toBeInTheDocument();
  });

  it("should open dialog when Add URL button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByText("Add Custom URL")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Add a custom URL to preview. This URL will not be added to the permanent sitemap.",
      ),
    ).toBeInTheDocument();
  });

  it("should show error when adding empty URL", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByText("Add Custom URL")).toBeInTheDocument();
    });

    const addButtonsInDialog = screen.getAllByRole("button", { name: "Add URL" });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("URL is required")).toBeInTheDocument();
    });
  });

  it("should show error when adding invalid URL", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("https://example.com/page")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("https://example.com/page"), "not-a-url");

    const addButtonsInDialog = screen.getAllByRole("button", { name: "Add URL" });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid URL format")).toBeInTheDocument();
    });
  });

  it("should show error when URL does not start with http", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("https://example.com/page")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("https://example.com/page"),
      "ftp://example.com",
    );

    const addButtonsInDialog = screen.getAllByRole("button", { name: "Add URL" });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("URL must start with http:// or https://")).toBeInTheDocument();
    });
  });

  it("should show error when adding duplicate URL", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("https://example.com/page")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("https://example.com/page"),
      "https://spike.land/",
    );

    const addButtonsInDialog = screen.getAllByRole("button", { name: "Add URL" });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("URL already exists in the list")).toBeInTheDocument();
    });
  });

  it("should add valid custom URL", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("https://example.com/page")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("https://example.com/page"),
      "https://example.com/new-page",
    );

    const addButtonsInDialog = screen.getAllByRole("button", { name: "Add URL" });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/0 \/ 4 loaded/)).toBeInTheDocument();
    });
  });

  it("should close dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByText("Add Custom URL")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Add Custom URL")).not.toBeInTheDocument();
    });
  });

  it("should show Custom badge for tracked URLs", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={["https://custom.example.com/page"]}
      />,
    );

    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("should render remove button for custom URLs", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={["https://custom.example.com/page"]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove https://custom.example.com/page" }),
    ).toBeInTheDocument();
  });

  it("should remove custom URL when remove button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={["https://custom.example.com/page"]}
      />,
    );

    expect(screen.getByText(/0 \/ 4 loaded/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove https://custom.example.com/page" }),
    );

    expect(screen.getByText(/0 \/ 3 loaded/)).toBeInTheDocument();
  });

  it("should not render remove button for sitemap URLs", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Remove https:\/\/spike.land/ }),
    ).not.toBeInTheDocument();
  });

  it("should merge tracked URLs with sitemap URLs without duplicates", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={["https://spike.land/", "https://custom.example.com/page"]}
      />,
    );

    expect(screen.getByText(/0 \/ 4 loaded/)).toBeInTheDocument();
  });

  it("should show Queued status for URLs not yet loading", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={Array.from({ length: 10 }, (_, i) => `https://spike.land/page-${i}`)}
        trackedUrls={[]}
      />,
    );

    const queuedElements = screen.getAllByText("Queued");
    expect(queuedElements.length).toBeGreaterThan(0);
  });

  it("should load iframes with correct src", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    const iframes = screen.getAllByTitle(/Preview of/);
    expect(iframes.length).toBeGreaterThan(0);
  });

  it("should update loaded count when iframe loads", async () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={["https://spike.land/"]}
        trackedUrls={[]}
      />,
    );

    const iframe = screen.getByTitle("Preview of https://spike.land/");
    fireEvent.load(iframe);

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 1 loaded/)).toBeInTheDocument();
    });
  });

  it("should add URL when Enter key is pressed in input", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("https://example.com/page")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("https://example.com/page");
    await user.type(input, "https://example.com/enter-test");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText(/0 \/ 4 loaded/)).toBeInTheDocument();
    });
  });

  it("should clear error when input changes", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add URL" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("https://example.com/page")).toBeInTheDocument();
    });

    const addButtonsInDialog = screen.getAllByRole("button", { name: "Add URL" });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("URL is required")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("https://example.com/page"), "a");

    await waitFor(() => {
      expect(screen.queryByText("URL is required")).not.toBeInTheDocument();
    });
  });

  it("should show loading spinner for loading URLs", () => {
    render(
      <SitemapPreviewClient
        sitemapUrls={defaultSitemapUrls}
        trackedUrls={defaultTrackedUrls}
      />,
    );

    const loadingElements = screen.getAllByText("Loading...");
    expect(loadingElements.length).toBeLessThanOrEqual(MAX_CONCURRENT_LOADS);
  });
});

const MAX_CONCURRENT_LOADS = 4;
