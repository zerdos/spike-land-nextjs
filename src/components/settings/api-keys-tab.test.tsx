import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeysTab } from "./api-keys-tab";

// Mock next/link
vi.mock("next/link", () => ({
  default: (
    { href, children, className }: { href: string; children: React.ReactNode; className?: string; },
  ) => <a href={href} className={className}>{children}</a>,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock clipboard API
const mockWriteText = vi.fn();
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
});

describe("ApiKeysTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockWriteText.mockReset().mockResolvedValue(undefined);
  });

  describe("Loading state", () => {
    it("shows loading message while fetching API keys", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<ApiKeysTab />);

      expect(screen.getByText("Loading API keys...")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows empty state when no API keys exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: [] }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("No API Keys")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Create an API key to use the MCP server or make programmatic requests."),
      ).toBeInTheDocument();
    });
  });

  describe("API keys list", () => {
    const mockApiKeys = [
      {
        id: "key-1",
        name: "Test Key 1",
        keyPrefix: "sk_live_abc",
        lastUsedAt: null,
        isActive: true,
        createdAt: "2024-01-15T10:00:00Z",
      },
      {
        id: "key-2",
        name: "Test Key 2",
        keyPrefix: "sk_live_def",
        lastUsedAt: "2024-01-20T10:00:00Z",
        isActive: true,
        createdAt: "2024-01-10T10:00:00Z",
      },
      {
        id: "key-3",
        name: "Revoked Key",
        keyPrefix: "sk_live_ghi",
        lastUsedAt: null,
        isActive: false,
        createdAt: "2024-01-05T10:00:00Z",
      },
    ];

    it("displays API keys with their details", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key 1")).toBeInTheDocument();
      });

      expect(screen.getByText("Test Key 2")).toBeInTheDocument();
      expect(screen.getByText("Revoked Key")).toBeInTheDocument();
      expect(screen.getByText("sk_live_abc")).toBeInTheDocument();
      expect(screen.getByText("sk_live_def")).toBeInTheDocument();
    });

    it("shows 'Never used' for keys without lastUsedAt", async () => {
      const unusedKeyMock = {
        ok: true,
        json: async () => ({
          apiKeys: [
            {
              id: "key-1",
              name: "Unused Key",
              keyPrefix: "sk_live_abc",
              lastUsedAt: null,
              isActive: true,
              createdAt: "2024-01-15T10:00:00Z",
            },
          ],
        }),
      };
      mockFetch.mockImplementation(() => Promise.resolve(unusedKeyMock));

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Unused Key")).toBeInTheDocument();
      });

      expect(screen.getByText("Never used")).toBeInTheDocument();
    });

    it("shows 'Revoked' badge for inactive keys", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Revoked")).toBeInTheDocument();
      });
    });

    it("hides revoke button for inactive keys", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          apiKeys: [
            {
              id: "key-1",
              name: "Revoked Key",
              keyPrefix: "sk_live_abc",
              lastUsedAt: null,
              isActive: false,
              createdAt: "2024-01-15T10:00:00Z",
            },
          ],
        }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Revoked Key")).toBeInTheDocument();
      });

      const revokeButtons = screen.queryAllByRole("button", { name: "" });
      const trashButtons = revokeButtons.filter((btn) =>
        btn.querySelector("svg")?.classList.contains("lucide-trash-2") ||
        btn.innerHTML.includes("Trash2")
      );
      expect(trashButtons.length).toBe(0);
    });
  });

  describe("Fetch error handling", () => {
    it("shows error message when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Failed to fetch API keys")).toBeInTheDocument();
      });
    });

    it("shows error message when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("shows generic error for non-Error objects", async () => {
      mockFetch.mockRejectedValueOnce("string error");

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load API keys")).toBeInTheDocument();
      });
    });
  });

  describe("Create API key dialog", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: [] }),
      });
    });

    it("opens create dialog when 'Create API Key' button is clicked", async () => {
      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Create API Key"));

      expect(screen.getByText("Create New API Key")).toBeInTheDocument();
      expect(
        screen.getByText("Give your API key a name to help you remember what it is used for."),
      ).toBeInTheDocument();
    });

    it("shows key name input in create dialog", async () => {
      const user = userEvent.setup();
      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      expect(screen.getByLabelText("Key Name")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("e.g., Claude Desktop, Development"),
      ).toBeInTheDocument();
    });

    it("closes dialog when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));
      expect(screen.getByText("Create New API Key")).toBeInTheDocument();

      await user.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.queryByText("Create New API Key")).not.toBeInTheDocument();
      });
    });

    it("disables 'Create Key' button when key name is empty", async () => {
      const user = userEvent.setup();
      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const createKeyButton = screen.getByRole("button", { name: "Create Key" });
      expect(createKeyButton).toBeDisabled();
    });

    it("disables 'Create Key' button when key name is only whitespace", async () => {
      const user = userEvent.setup();
      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const input = screen.getByLabelText("Key Name");
      await user.type(input, "   ");

      const createKeyButton = screen.getByRole("button", { name: "Create Key" });
      expect(createKeyButton).toBeDisabled();
    });

    it("creates API key successfully and shows the key", async () => {
      const user = userEvent.setup();

      const newApiKey = {
        id: "new-key-1",
        name: "New Test Key",
        keyPrefix: "sk_live_xyz",
        key: "sk_live_xyz_full_key_123",
        lastUsedAt: null,
        isActive: true,
        createdAt: "2024-01-25T10:00:00Z",
      };

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const input = screen.getByLabelText("Key Name");
      await user.type(input, "New Test Key");

      // Mock the create API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKey: newApiKey }),
      });

      // Mock the refresh call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          apiKeys: [
            {
              id: "new-key-1",
              name: "New Test Key",
              keyPrefix: "sk_live_xyz",
              lastUsedAt: null,
              isActive: true,
              createdAt: "2024-01-25T10:00:00Z",
            },
          ],
        }),
      });

      await user.click(screen.getByRole("button", { name: "Create Key" }));

      await waitFor(() => {
        expect(screen.getByText("API Key Created")).toBeInTheDocument();
      });

      expect(screen.getByText("sk_live_xyz_full_key_123")).toBeInTheDocument();
      expect(
        screen.getByText("Copy your API key now. For security, it will not be shown again."),
      ).toBeInTheDocument();
    });

    it("shows 'Creating...' while creating key", async () => {
      const user = userEvent.setup();

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const input = screen.getByLabelText("Key Name");
      await user.type(input, "New Test Key");

      // Mock a slow create API call
      mockFetch.mockImplementation(() => new Promise(() => {}));

      await user.click(screen.getByRole("button", { name: "Create Key" }));

      expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    });

    it("shows error when API key creation fails", async () => {
      const user = userEvent.setup();

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const input = screen.getByLabelText("Key Name");
      await user.type(input, "New Test Key");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to create API key" }),
      });

      await user.click(screen.getByRole("button", { name: "Create Key" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to create API key")).toBeInTheDocument();
      });
    });

    it("shows error when API key creation fails with non-Error object", async () => {
      const user = userEvent.setup();

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const input = screen.getByLabelText("Key Name");
      await user.type(input, "New Test Key");

      mockFetch.mockRejectedValueOnce("string error");

      await user.click(screen.getByRole("button", { name: "Create Key" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to create API key")).toBeInTheDocument();
      });
    });

    it("shows fallback error when API returns no error message", async () => {
      const user = userEvent.setup();

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const input = screen.getByLabelText("Key Name");
      await user.type(input, "New Test Key");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      await user.click(screen.getByRole("button", { name: "Create Key" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to create API key")).toBeInTheDocument();
      });
    });

    it("closes dialog and resets state when 'Done' is clicked after creating key", async () => {
      const user = userEvent.setup();

      const newApiKey = {
        id: "new-key-1",
        name: "New Test Key",
        keyPrefix: "sk_live_xyz",
        key: "sk_live_xyz_full_key_123",
        lastUsedAt: null,
        isActive: true,
        createdAt: "2024-01-25T10:00:00Z",
      };

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const input = screen.getByLabelText("Key Name");
      await user.type(input, "New Test Key");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKey: newApiKey }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: [] }),
      });

      await user.click(screen.getByRole("button", { name: "Create Key" }));

      await waitFor(() => {
        expect(screen.getByText("API Key Created")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Done" }));

      await waitFor(() => {
        expect(screen.queryByText("API Key Created")).not.toBeInTheDocument();
      });
    });

    it("copies the new API key to clipboard", async () => {
      const user = userEvent.setup();

      const newApiKey = {
        id: "new-key-1",
        name: "New Test Key",
        keyPrefix: "sk_live_xyz",
        key: "sk_live_xyz_full_key_123",
        lastUsedAt: null,
        isActive: true,
        createdAt: "2024-01-25T10:00:00Z",
      };

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const input = screen.getByLabelText("Key Name");
      await user.type(input, "New Test Key");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKey: newApiKey }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: [] }),
      });

      await user.click(screen.getByRole("button", { name: "Create Key" }));

      await waitFor(() => {
        expect(screen.getByText("API Key Created")).toBeInTheDocument();
      });

      // Find and click the copy button (variant="outline" size="icon")
      const copyButtons = screen.getAllByRole("button");
      // The copy button is a small icon button next to the key code
      const copyButton = copyButtons.find((btn) =>
        btn.querySelector("svg") && !btn.textContent?.includes("Done")
      );

      expect(copyButton).toBeTruthy();
      if (copyButton) {
        await user.click(copyButton);
        expect(mockWriteText).toHaveBeenCalledWith("sk_live_xyz_full_key_123");
      }
    });
  });

  describe("Revoke API key", () => {
    it("revokes an API key successfully", async () => {
      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key 1",
          keyPrefix: "sk_live_abc",
          lastUsedAt: null,
          isActive: true,
          createdAt: "2024-01-15T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key 1")).toBeInTheDocument();
      });

      // Mock the revoke API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Mock the refresh call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: [] }),
      });

      // Find and click the revoke button
      const revokeButtons = screen.getAllByRole("button");
      const revokeButton = revokeButtons.find((btn) => btn.classList.contains("text-destructive"));

      if (revokeButton) {
        fireEvent.click(revokeButton);
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/settings/api-keys/key-1", {
          method: "DELETE",
        });
      });
    });

    it("shows error when revoke fails", async () => {
      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key 1",
          keyPrefix: "sk_live_abc",
          lastUsedAt: null,
          isActive: true,
          createdAt: "2024-01-15T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key 1")).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to revoke API key" }),
      });

      const revokeButtons = screen.getAllByRole("button");
      const revokeButton = revokeButtons.find((btn) => btn.classList.contains("text-destructive"));

      if (revokeButton) {
        fireEvent.click(revokeButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Failed to revoke API key")).toBeInTheDocument();
      });
    });

    it("shows generic error when revoke fails with non-Error object", async () => {
      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key 1",
          keyPrefix: "sk_live_abc",
          lastUsedAt: null,
          isActive: true,
          createdAt: "2024-01-15T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key 1")).toBeInTheDocument();
      });

      mockFetch.mockRejectedValueOnce("string error");

      const revokeButtons = screen.getAllByRole("button");
      const revokeButton = revokeButtons.find((btn) => btn.classList.contains("text-destructive"));

      if (revokeButton) {
        fireEvent.click(revokeButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Failed to revoke API key")).toBeInTheDocument();
      });
    });

    it("shows fallback error when revoke API returns no error message", async () => {
      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key 1",
          keyPrefix: "sk_live_abc",
          lastUsedAt: null,
          isActive: true,
          createdAt: "2024-01-15T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key 1")).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      const revokeButtons = screen.getAllByRole("button");
      const revokeButton = revokeButtons.find((btn) => btn.classList.contains("text-destructive"));

      if (revokeButton) {
        fireEvent.click(revokeButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Failed to revoke API key")).toBeInTheDocument();
      });
    });

    it("disables revoke button while revoking", async () => {
      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key 1",
          keyPrefix: "sk_live_abc",
          lastUsedAt: null,
          isActive: true,
          createdAt: "2024-01-15T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key 1")).toBeInTheDocument();
      });

      // Mock a slow revoke call
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const revokeButtons = screen.getAllByRole("button");
      const revokeButton = revokeButtons.find((btn) => btn.classList.contains("text-destructive"));

      if (revokeButton) {
        fireEvent.click(revokeButton);
        expect(revokeButton).toBeDisabled();
      }
    });
  });

  describe("formatLastUsed helper", () => {
    it("displays 'Just now' for usage less than a minute ago", async () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key",
          keyPrefix: "sk_live_abc",
          lastUsedAt: thirtySecondsAgo.toISOString(),
          isActive: true,
          createdAt: "2024-01-01T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key")).toBeInTheDocument();
      });

      expect(screen.getByText("Just now")).toBeInTheDocument();
    });

    it("displays minutes ago for recent usage", async () => {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key",
          keyPrefix: "sk_live_abc",
          lastUsedAt: fifteenMinutesAgo.toISOString(),
          isActive: true,
          createdAt: "2024-01-01T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key")).toBeInTheDocument();
      });

      expect(screen.getByText("15 min ago")).toBeInTheDocument();
    });

    it("displays single hour ago correctly", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key",
          keyPrefix: "sk_live_abc",
          lastUsedAt: oneHourAgo.toISOString(),
          isActive: true,
          createdAt: "2024-01-01T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key")).toBeInTheDocument();
      });

      expect(screen.getByText("1 hour ago")).toBeInTheDocument();
    });

    it("displays multiple hours ago correctly", async () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key",
          keyPrefix: "sk_live_abc",
          lastUsedAt: threeHoursAgo.toISOString(),
          isActive: true,
          createdAt: "2024-01-01T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key")).toBeInTheDocument();
      });

      expect(screen.getByText("3 hours ago")).toBeInTheDocument();
    });

    it("displays single day ago correctly", async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key",
          keyPrefix: "sk_live_abc",
          lastUsedAt: oneDayAgo.toISOString(),
          isActive: true,
          createdAt: "2024-01-01T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key")).toBeInTheDocument();
      });

      expect(screen.getByText("1 day ago")).toBeInTheDocument();
    });

    it("displays multiple days ago correctly", async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key",
          keyPrefix: "sk_live_abc",
          lastUsedAt: threeDaysAgo.toISOString(),
          isActive: true,
          createdAt: "2024-01-01T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key")).toBeInTheDocument();
      });

      expect(screen.getByText("3 days ago")).toBeInTheDocument();
    });

    it("displays formatted date for usage over a week ago", async () => {
      const mockApiKeys = [
        {
          id: "key-1",
          name: "Test Key",
          keyPrefix: "sk_live_abc",
          lastUsedAt: "2024-01-10T12:00:00Z", // Old date
          isActive: true,
          createdAt: "2024-01-01T10:00:00Z",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: mockApiKeys }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test Key")).toBeInTheDocument();
      });

      expect(screen.getByText("Jan 10, 2024")).toBeInTheDocument();
    });
  });

  describe("Static content", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: [] }),
      });
    });

    it("renders the card title and description", async () => {
      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("API Keys")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Manage your API keys for MCP server and programmatic access"),
      ).toBeInTheDocument();
    });

    it("renders usage documentation section", async () => {
      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Using your API Keys")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Use your API key to authenticate with the MCP server or REST API:"),
      ).toBeInTheDocument();
      expect(screen.getByText("REST API:")).toBeInTheDocument();
      expect(screen.getByText("MCP Server:")).toBeInTheDocument();
    });

    it("renders documentation links", async () => {
      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Test your API keys")).toBeInTheDocument();
      });

      expect(screen.getByText("View usage history")).toBeInTheDocument();

      const testLink = screen.getByRole("link", { name: /Test your API keys/i });
      expect(testLink).toHaveAttribute("href", "/apps/pixel/mcp-tools");

      const historyLink = screen.getByRole("link", { name: /View usage history/i });
      expect(historyLink).toHaveAttribute("href", "/settings/mcp-history");
    });
  });

  describe("Copy functionality", () => {
    it("copy button calls clipboard writeText", async () => {
      const user = userEvent.setup();

      const newApiKey = {
        id: "new-key-1",
        name: "New Test Key",
        keyPrefix: "sk_live_xyz",
        key: "sk_live_xyz_full_key_123",
        lastUsedAt: null,
        isActive: true,
        createdAt: "2024-01-25T10:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: [] }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Create API Key"));

      const input = screen.getByLabelText("Key Name");
      await user.type(input, "New Test Key");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKey: newApiKey }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: [] }),
      });

      await user.click(screen.getByRole("button", { name: "Create Key" }));

      await waitFor(() => {
        expect(screen.getByText("API Key Created")).toBeInTheDocument();
      });

      // Find and click the copy button
      const copyButtons = screen.getAllByRole("button");
      const copyButton = copyButtons.find((btn) =>
        btn.querySelector("svg") && !btn.textContent?.includes("Done")
      );

      expect(copyButton).toBeTruthy();
      if (copyButton) {
        await user.click(copyButton);
        expect(mockWriteText).toHaveBeenCalledWith("sk_live_xyz_full_key_123");
      }
    });
  });

  describe("handleCreateKey with empty key name", () => {
    it("create button is disabled when key name is empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ apiKeys: [] }),
      });

      render(<ApiKeysTab />);

      await waitFor(() => {
        expect(screen.getByText("Create API Key")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Create API Key"));

      // The button should be disabled for empty input
      const createKeyButton = screen.getByRole("button", { name: "Create Key" });
      expect(createKeyButton).toBeDisabled();

      // Only 1 fetch call should have happened (initial load)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
