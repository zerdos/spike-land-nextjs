/**
 * Tests for Sitemap Preview Client Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SitemapPreviewClient } from "./SitemapPreviewClient";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SitemapPreviewClient", () => {
  const defaultSitemapPaths = ["/", "/pricing", "/apps"];
  const defaultTrackedPaths: { id: string; path: string; }[] = [];
  const defaultOrigin = "http://localhost:3000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("should render all sitemap paths", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    expect(screen.getByText("/")).toBeInTheDocument();
    expect(screen.getByText("/pricing")).toBeInTheDocument();
    expect(screen.getByText("/apps")).toBeInTheDocument();
  });

  it("should show loading status badges", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    expect(screen.getByText(/0 \/ 3 loaded/)).toBeInTheDocument();
  });

  it("should render Add Path button", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add Path" }),
    ).toBeInTheDocument();
  });

  it("should open dialog when Add Path button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(screen.getByText("Add Custom Path")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Add a custom path to preview. The path will be persisted to the database and available across environments.",
      ),
    ).toBeInTheDocument();
  });

  it("should show error when adding empty path", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(screen.getByText("Add Custom Path")).toBeInTheDocument();
    });

    const addButtonsInDialog = screen.getAllByRole("button", {
      name: "Add Path",
    });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Path is required")).toBeInTheDocument();
    });
  });

  it("should show error when adding duplicate path", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("/custom-page"),
      ).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("/custom-page"), "/");

    const addButtonsInDialog = screen.getAllByRole("button", {
      name: "Add Path",
    });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Path already exists in the list"),
      ).toBeInTheDocument();
    });
  });

  it("should add valid custom path via API", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          trackedPath: {
            id: "new-path-id",
            path: "/new-page",
          },
        }),
    });

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("/custom-page"),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("/custom-page"),
      "/new-page",
    );

    const addButtonsInDialog = screen.getAllByRole("button", {
      name: "Add Path",
    });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/tracked-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/new-page" }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/0 \/ 4 loaded/)).toBeInTheDocument();
    });
  });

  it("should extract path from full URL when adding", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          trackedPath: {
            id: "new-path-id",
            path: "/extracted-path",
          },
        }),
    });

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("/custom-page"),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("/custom-page"),
      "https://example.com/extracted-path",
    );

    const addButtonsInDialog = screen.getAllByRole("button", {
      name: "Add Path",
    });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/tracked-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/extracted-path" }),
      });
    });
  });

  it("should add leading slash if missing", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          trackedPath: {
            id: "new-path-id",
            path: "/no-slash-page",
          },
        }),
    });

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("/custom-page"),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("/custom-page"),
      "no-slash-page",
    );

    const addButtonsInDialog = screen.getAllByRole("button", {
      name: "Add Path",
    });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/tracked-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/no-slash-page" }),
      });
    });
  });

  it("should show API error when add fails", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Path already tracked" }),
    });

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("/custom-page"),
      ).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("/custom-page"),
      "/some-page",
    );

    const addButtonsInDialog = screen.getAllByRole("button", {
      name: "Add Path",
    });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Path already tracked")).toBeInTheDocument();
    });
  });

  it("should close dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(screen.getByText("Add Custom Path")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Add Custom Path")).not.toBeInTheDocument();
    });
  });

  it("should show Custom badge for tracked paths", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={[{ id: "1", path: "/custom-page" }]}
        origin={defaultOrigin}
      />,
    );

    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("should render remove button for custom paths", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={[{ id: "1", path: "/custom-page" }]}
        origin={defaultOrigin}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove /custom-page" }),
    ).toBeInTheDocument();
  });

  it("should remove custom path via API when remove button is clicked", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={[{ id: "path-123", path: "/custom-page" }]}
        origin={defaultOrigin}
      />,
    );

    expect(screen.getByText(/0 \/ 4 loaded/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove /custom-page" }),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/tracked-urls?id=path-123",
        {
          method: "DELETE",
        },
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/0 \/ 3 loaded/)).toBeInTheDocument();
    });
  });

  it("should not render remove button for sitemap paths", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Remove \// }),
    ).not.toBeInTheDocument();
  });

  it("should merge tracked paths with sitemap paths without duplicates", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={[
          { id: "1", path: "/" },
          { id: "2", path: "/custom-page" },
        ]}
        origin={defaultOrigin}
      />,
    );

    // 3 sitemap + 1 custom (/ is duplicate so not counted)
    expect(screen.getByText(/0 \/ 4 loaded/)).toBeInTheDocument();
  });

  it("should show Queued status for paths not yet loading", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={Array.from(
          { length: 10 },
          (_, i) => `/page-${i}`,
        )}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    const queuedElements = screen.getAllByText("Queued");
    expect(queuedElements.length).toBeGreaterThan(0);
  });

  it("should load iframes with correct src based on origin", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    const iframes = screen.getAllByTitle(/Preview of/);
    expect(iframes.length).toBeGreaterThan(0);

    // Check that iframe src includes origin
    const iframe = iframes[0] as HTMLIFrameElement;
    expect(iframe.src).toContain("http://localhost:3000");
  });

  it("should update loaded count when iframe loads", async () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    const iframe = screen.getByTitle("Preview of /");
    fireEvent.load(iframe);

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 1 loaded/)).toBeInTheDocument();
    });
  });

  it("should add path when Enter key is pressed in input", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          trackedPath: {
            id: "new-path-id",
            path: "/enter-test",
          },
        }),
    });

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("/custom-page"),
      ).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("/custom-page");
    await user.type(input, "/enter-test");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("should clear error when input changes", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Path" }));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("/custom-page"),
      ).toBeInTheDocument();
    });

    const addButtonsInDialog = screen.getAllByRole("button", {
      name: "Add Path",
    });
    const submitButton = addButtonsInDialog[addButtonsInDialog.length - 1];
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Path is required")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("/custom-page"), "a");

    await waitFor(() => {
      expect(screen.queryByText("Path is required")).not.toBeInTheDocument();
    });
  });

  it("should show loading spinner for loading paths", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={defaultSitemapPaths}
        trackedPaths={defaultTrackedPaths}
        origin={defaultOrigin}
      />,
    );

    const loadingElements = screen.getAllByText("Loading...");
    expect(loadingElements.length).toBeLessThanOrEqual(MAX_CONCURRENT_LOADS);
  });

  it("should display path directly in card title", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/some/nested/path"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    expect(screen.getByText("/some/nested/path")).toBeInTheDocument();
  });

  it("should use origin from props for iframe URLs", () => {
    const customOrigin = "https://spike.land";

    render(
      <SitemapPreviewClient
        sitemapPaths={["/test"]}
        trackedPaths={[]}
        origin={customOrigin}
      />,
    );

    const iframe = screen.getByTitle("Preview of /test") as HTMLIFrameElement;
    expect(iframe.src).toBe("https://spike.land/test");
  });

  it("should show health status badges", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    expect(screen.getByText(/Healthy/)).toBeInTheDocument();
  });

  it("should show visible/hidden count in badges", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[{ id: "1", path: "/", isActive: false }]}
        origin={defaultOrigin}
      />,
    );

    expect(screen.getByText(/0 visible \/ 1 hidden/)).toBeInTheDocument();
  });

  it("should render Show/Hide Hidden Paths toggle button", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Show Hidden Paths" }),
    ).toBeInTheDocument();
  });

  it("should toggle Show/Hide Hidden Paths button text when clicked", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    const toggleButton = screen.getByRole("button", {
      name: "Show Hidden Paths",
    });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Hide Hidden Paths" }),
      ).toBeInTheDocument();
    });
  });

  it("should show hidden paths when Show Hidden Paths is toggled", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[{ id: "1", path: "/", isActive: false }]}
        origin={defaultOrigin}
      />,
    );

    // Initially hidden path should not be visible (0 paths visible)
    expect(screen.queryByText("/")).not.toBeInTheDocument();

    const toggleButton = screen.getByRole("button", {
      name: "Show Hidden Paths",
    });
    await user.click(toggleButton);

    // Now hidden path should be visible
    await waitFor(() => {
      expect(screen.getByText("/")).toBeInTheDocument();
    });
  });

  it("should render Refresh All button", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Refresh All/ }),
    ).toBeInTheDocument();
  });

  it("should reset all path statuses when Refresh All is clicked", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    const iframe = screen.getByTitle("Preview of /");
    fireEvent.load(iframe);

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
    });

    const refreshAllButton = screen.getByRole("button", {
      name: /Refresh All/,
    });
    await user.click(refreshAllButton);

    await waitFor(() => {
      expect(screen.getByText(/0 \/ 1 loaded/)).toBeInTheDocument();
    });
  });

  it("should toggle path visibility when hide/show button is clicked", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          trackedPath: { id: "1", path: "/", isActive: false },
        }),
    });

    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[{ id: "1", path: "/", isActive: true }]}
        origin={defaultOrigin}
      />,
    );

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText("/")).toBeInTheDocument();
    });

    // Find and click the hide/show button (eye icon button)
    const buttons = screen.getAllByRole("button");
    const hideButton = buttons.find(
      (btn) => btn.title === "Hide this path",
    );

    expect(hideButton).toBeDefined();
    if (hideButton) {
      await user.click(hideButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/admin/tracked-urls", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: "/", isActive: false }),
        });
      });
    }
  });

  it("should show Hidden badge for hidden paths", async () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[{ id: "1", path: "/", isActive: false }]}
        origin={defaultOrigin}
      />,
    );

    // Toggle to show hidden paths
    const toggleButton = screen.getByRole("button", {
      name: "Show Hidden Paths",
    });
    await userEvent.setup().click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText("Hidden")).toBeInTheDocument();
    });
  });

  it("should refresh individual path when refresh button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    const iframe = screen.getByTitle("Preview of /");
    fireEvent.load(iframe);

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
    });

    // Find the refresh button for the specific path
    const buttons = screen.getAllByRole("button");
    const refreshButton = buttons.find(
      (btn) => btn.title === "Reload this iframe",
    );

    expect(refreshButton).toBeDefined();
    if (refreshButton) {
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/0 \/ 1 loaded/)).toBeInTheDocument();
      });
    }
  });

  it("should open path in new tab when external link button is clicked", async () => {
    const user = userEvent.setup();
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const externalLinkButton = buttons.find(
      (btn) => btn.title === "Open in new tab",
    );

    expect(externalLinkButton).toBeDefined();
    if (externalLinkButton) {
      await user.click(externalLinkButton);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        "http://localhost:3000/",
        "_blank",
      );
    }

    windowOpenSpy.mockRestore();
  });

  it("should handle isActive prop from tracked paths", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[{ id: "1", path: "/", isActive: true }]}
        origin={defaultOrigin}
      />,
    );

    // Path should be visible since it's active
    expect(screen.getByText("/")).toBeInTheDocument();
  });

  it("should update stats when paths change status", async () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    // Initially 0 loaded
    expect(screen.getByText(/0 Healthy/)).toBeInTheDocument();

    const iframe = screen.getByTitle("Preview of /");
    fireEvent.load(iframe);

    await waitFor(() => {
      expect(screen.getByText(/1 Healthy/)).toBeInTheDocument();
    });
  });

  it("should show error badge when iframe fails to load", async () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    const iframe = screen.getByTitle("Preview of /");
    fireEvent.error(iframe);

    await waitFor(() => {
      expect(screen.getByText(/1 Error/)).toBeInTheDocument();
    });
  });

  it("should filter paths based on hidden status", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/page1", "/page2"]}
        trackedPaths={[{ id: "1", path: "/page1", isActive: false }]}
        origin={defaultOrigin}
      />,
    );

    // Only page2 should be visible (page1 is hidden)
    expect(screen.queryByText("/page1")).not.toBeInTheDocument();
    expect(screen.getByText("/page2")).toBeInTheDocument();
  });

  it("should render Add Custom Path button", () => {
    render(
      <SitemapPreviewClient
        sitemapPaths={["/"]}
        trackedPaths={[]}
        origin={defaultOrigin}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Add Custom Path/ }),
    ).toBeInTheDocument();
  });
});

const MAX_CONCURRENT_LOADS = 4;
