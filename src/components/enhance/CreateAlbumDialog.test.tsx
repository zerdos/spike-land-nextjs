import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateAlbumDialog } from "./CreateAlbumDialog";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CreateAlbumDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders default trigger button", () => {
      render(<CreateAlbumDialog />);
      expect(screen.getByRole("button", { name: /new album/i })).toBeInTheDocument();
    });

    it("renders custom trigger", () => {
      render(<CreateAlbumDialog trigger={<button>Custom Trigger</button>} />);
      expect(screen.getByRole("button", { name: /custom trigger/i })).toBeInTheDocument();
    });

    it("opens dialog when trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Create New Album")).toBeInTheDocument();
    });

    it("shows form fields when dialog is open", async () => {
      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));

      expect(screen.getByLabelText(/album name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/privacy/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create album/i })).toBeInTheDocument();
    });
  });

  describe("form behavior", () => {
    it("disables create button when name is empty", async () => {
      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));

      const createButton = screen.getByRole("button", { name: /create album/i });
      expect(createButton).toBeDisabled();
    });

    it("enables create button when name is entered", async () => {
      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "My Test Album");

      const createButton = screen.getByRole("button", { name: /create album/i });
      expect(createButton).not.toBeDisabled();
    });

    it("closes dialog when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("clears error state when dialog is closed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Test error" }),
      });

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      // Open dialog and trigger error
      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test");
      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(screen.getByText("Test error")).toBeInTheDocument();
      });

      // Close dialog
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Error should not persist when dialog is closed
      expect(screen.queryByText("Test error")).not.toBeInTheDocument();
    });
  });

  describe("album creation", () => {
    it("calls API with correct data on create", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ album: { id: "1", name: "Test Album", privacy: "PRIVATE" } }),
      });

      const user = userEvent.setup();
      const onAlbumCreated = vi.fn();
      render(<CreateAlbumDialog onAlbumCreated={onAlbumCreated} />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test Album");
      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/albums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test Album", privacy: "PRIVATE" }),
        });
      });
    });

    it("calls onAlbumCreated callback on success", async () => {
      const createdAlbum = { id: "1", name: "Test Album", privacy: "PRIVATE" as const };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ album: createdAlbum }),
      });

      const user = userEvent.setup();
      const onAlbumCreated = vi.fn();
      render(<CreateAlbumDialog onAlbumCreated={onAlbumCreated} />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test Album");
      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(onAlbumCreated).toHaveBeenCalledWith(createdAlbum);
      });
    });

    it("closes dialog on successful creation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ album: { id: "1", name: "Test Album", privacy: "PRIVATE" } }),
      });

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test Album");
      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("shows loading state while creating", async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test Album");
      await user.click(screen.getByRole("button", { name: /create album/i }));

      expect(screen.getByRole("button", { name: /create album/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
    });
  });

  describe("error handling", () => {
    it("displays error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Album name already exists" }),
      });

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test Album");
      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(screen.getByText("Album name already exists")).toBeInTheDocument();
      });
    });

    it("displays generic error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test Album");
      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("keeps dialog open on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed" }),
      });

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test Album");
      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });
  });

  describe("privacy selection", () => {
    it("defaults to PRIVATE privacy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ album: { id: "1", name: "Test", privacy: "PRIVATE" } }),
      });

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test");
      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/albums",
          expect.objectContaining({
            body: expect.stringContaining('"privacy":"PRIVATE"'),
          }),
        );
      });
    });

    it("can select PUBLIC privacy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ album: { id: "1", name: "Test", privacy: "PUBLIC" } }),
      });

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test");

      // Open privacy select
      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByRole("option", { name: /public/i }));

      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/albums",
          expect.objectContaining({
            body: expect.stringContaining('"privacy":"PUBLIC"'),
          }),
        );
      });
    });

    it("can select UNLISTED privacy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ album: { id: "1", name: "Test", privacy: "UNLISTED" } }),
      });

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      await user.type(screen.getByLabelText(/album name/i), "Test");

      // Open privacy select
      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByRole("option", { name: /unlisted/i }));

      await user.click(screen.getByRole("button", { name: /create album/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/albums",
          expect.objectContaining({
            body: expect.stringContaining('"privacy":"UNLISTED"'),
          }),
        );
      });
    });
  });

  describe("keyboard navigation", () => {
    it("submits on Enter key when name is filled", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ album: { id: "1", name: "Test", privacy: "PRIVATE" } }),
      });

      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      const input = screen.getByLabelText(/album name/i);
      await user.type(input, "Test Album");
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("does not submit on Enter when name is empty", async () => {
      const user = userEvent.setup();
      render(<CreateAlbumDialog />);

      await user.click(screen.getByRole("button", { name: /new album/i }));
      const input = screen.getByLabelText(/album name/i);
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
