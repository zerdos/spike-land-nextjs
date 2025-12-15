import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";

vi.mock("next-auth/react");
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockUseSession = vi.mocked(useSession);
const mockRedirect = vi.mocked(redirect);

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication States", () => {
    it("renders loading state while session is loading", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("redirects to signin page when user is not authenticated", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
    });

    it("renders settings page when user is authenticated", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "John Doe",
            email: "john@example.com",
            image: "https://example.com/avatar.jpg",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByTestId("settings-page")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Manage your account settings and preferences"))
        .toBeInTheDocument();
    });
  });

  describe("Profile Tab", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "John Doe",
            email: "john@example.com",
            image: "https://example.com/avatar.jpg",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });
    });

    it("displays user profile information", () => {
      render(<SettingsPage />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("displays user avatar with correct props", () => {
      render(<SettingsPage />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      const avatarContainer = screen.getByText("John Doe").closest("div");
      expect(avatarContainer).toBeInTheDocument();
    });

    it("displays user initials as fallback when no image", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "John Doe",
            email: "john@example.com",
            image: null,
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("displays single letter fallback for single name", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "Madonna",
            email: "madonna@example.com",
            image: null,
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByText("M")).toBeInTheDocument();
    });

    it("displays U fallback when no name is provided", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: null,
            email: "user@example.com",
            image: null,
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByText("U")).toBeInTheDocument();
    });

    it("allows user to enter display name", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const displayNameInput = screen.getByLabelText("Display Name");
      await user.type(displayNameInput, "Johnny");

      expect(displayNameInput).toHaveValue("Johnny");
    });

    it("shows email as disabled field", () => {
      render(<SettingsPage />);

      const emailInput = screen.getByLabelText("Email");
      expect(emailInput).toBeDisabled();
      expect(emailInput).toHaveValue("john@example.com");
      expect(
        screen.getByText(
          "Email is managed by your OAuth provider and cannot be changed here",
        ),
      ).toBeInTheDocument();
    });

    it("handles save profile button click", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const saveButton = screen.getByTestId("save-profile-button");
      await user.click(saveButton);

      expect(screen.getByText("Saving...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Save Changes")).toBeInTheDocument();
      });
    });

    it("disables save button while saving", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const saveButton = screen.getByTestId("save-profile-button");
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();
    });
  });

  describe("Preferences Tab", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "John Doe",
            email: "john@example.com",
            image: "https://example.com/avatar.jpg",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });
    });

    it("switches to preferences tab", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const preferencesTab = screen.getByRole("tab", { name: "Preferences" });
      await user.click(preferencesTab);

      expect(screen.getByTestId("preferences-tab")).toBeInTheDocument();
      expect(screen.getByText("Account Preferences")).toBeInTheDocument();
    });

    it("toggles email notifications switch", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const preferencesTab = screen.getByRole("tab", { name: "Preferences" });
      await user.click(preferencesTab);

      const emailSwitch = screen.getByTestId("email-notifications-switch");
      expect(emailSwitch).toBeChecked();

      await user.click(emailSwitch);
      expect(emailSwitch).not.toBeChecked();

      await user.click(emailSwitch);
      expect(emailSwitch).toBeChecked();
    });

    it("toggles push notifications switch", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const preferencesTab = screen.getByRole("tab", { name: "Preferences" });
      await user.click(preferencesTab);

      const pushSwitch = screen.getByTestId("push-notifications-switch");
      expect(pushSwitch).not.toBeChecked();

      await user.click(pushSwitch);
      expect(pushSwitch).toBeChecked();

      await user.click(pushSwitch);
      expect(pushSwitch).not.toBeChecked();
    });
  });

  describe("Privacy Tab", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "John Doe",
            email: "john@example.com",
            image: "https://example.com/avatar.jpg",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });
    });

    it("switches to privacy tab", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const privacyTab = screen.getByRole("tab", { name: "Privacy" });
      await user.click(privacyTab);

      expect(screen.getByTestId("privacy-tab")).toBeInTheDocument();
      expect(screen.getByText("Privacy Settings")).toBeInTheDocument();
    });

    it("toggles public profile switch", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const privacyTab = screen.getByRole("tab", { name: "Privacy" });
      await user.click(privacyTab);

      const publicProfileSwitch = screen.getByTestId("public-profile-switch");
      expect(publicProfileSwitch).not.toBeChecked();

      await user.click(publicProfileSwitch);
      expect(publicProfileSwitch).toBeChecked();
    });

    it("toggles show activity switch", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const privacyTab = screen.getByRole("tab", { name: "Privacy" });
      await user.click(privacyTab);

      const activitySwitch = screen.getByTestId("show-activity-switch");
      expect(activitySwitch).toBeChecked();

      await user.click(activitySwitch);
      expect(activitySwitch).not.toBeChecked();
    });

    it("opens delete account dialog", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const privacyTab = screen.getByRole("tab", { name: "Privacy" });
      await user.click(privacyTab);

      const deleteButton = screen.getByTestId("delete-account-button");
      await user.click(deleteButton);

      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      expect(screen.getByText("Are you absolutely sure?")).toBeInTheDocument();
      expect(
        screen.getByText(
          "This action cannot be undone. This will permanently delete your account and remove all your data from our servers.",
        ),
      ).toBeInTheDocument();
    });

    it("closes delete dialog on cancel", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const privacyTab = screen.getByRole("tab", { name: "Privacy" });
      await user.click(privacyTab);

      const deleteButton = screen.getByTestId("delete-account-button");
      await user.click(deleteButton);

      const cancelButton = screen.getByTestId("cancel-delete-button");
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
      });
    });

    it("handles delete account confirmation", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const privacyTab = screen.getByRole("tab", { name: "Privacy" });
      await user.click(privacyTab);

      const deleteButton = screen.getByTestId("delete-account-button");
      await user.click(deleteButton);

      const confirmButton = screen.getByTestId("confirm-delete-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("Tabs Navigation", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "John Doe",
            email: "john@example.com",
            image: "https://example.com/avatar.jpg",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });
    });

    it("defaults to profile tab", () => {
      render(<SettingsPage />);

      expect(screen.getByTestId("profile-tab")).toBeInTheDocument();
      expect(screen.getByText("Profile Information")).toBeInTheDocument();
    });

    it("navigates between all tabs", async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const preferencesTab = screen.getByRole("tab", { name: "Preferences" });
      await user.click(preferencesTab);
      expect(screen.getByTestId("preferences-tab")).toBeInTheDocument();

      const privacyTab = screen.getByRole("tab", { name: "Privacy" });
      await user.click(privacyTab);
      expect(screen.getByTestId("privacy-tab")).toBeInTheDocument();

      const profileTab = screen.getByRole("tab", { name: "Profile" });
      await user.click(profileTab);
      expect(screen.getByTestId("profile-tab")).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "John Doe",
            email: "john@example.com",
            image: "https://example.com/avatar.jpg",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });
    });

    it("renders with responsive container classes", () => {
      render(<SettingsPage />);

      const container = screen.getByTestId("settings-page");
      expect(container).toHaveClass(
        "container",
        "mx-auto",
        "py-8",
        "px-4",
        "max-w-4xl",
      );
    });

    it("renders tabs with responsive grid layout", () => {
      render(<SettingsPage />);

      const tabsList = screen.getByRole("tablist");
      expect(tabsList).toHaveClass("grid", "w-full", "grid-cols-4");
    });
  });

  describe("Edge Cases", () => {
    it("handles session with undefined user", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: undefined,
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByTestId("settings-page")).toBeInTheDocument();
    });

    it("handles missing user name gracefully", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: undefined,
            email: "user@example.com",
            image: null,
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByText("U")).toBeInTheDocument();
    });

    it("handles missing user email gracefully", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "John Doe",
            email: undefined,
            image: null,
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      const emailInput = screen.getByLabelText("Email");
      expect(emailInput).toHaveValue("");
    });

    it("truncates long names to 2 initials", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "123",
            name: "John William Fitzgerald Kennedy",
            email: "jwfk@example.com",
            image: null,
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<SettingsPage />);

      expect(screen.getByText("JW")).toBeInTheDocument();
    });
  });
});
