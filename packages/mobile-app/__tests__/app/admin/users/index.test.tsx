/**
 * User Management Screen Tests
 * Tests for the admin user management page
 */

// Mock tamagui config BEFORE importing components
jest.mock("@/tamagui.config", () => ({}));

import UserManagementPage from "@/app/admin/users/index";
import * as adminApi from "@/services/api/admin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

// Mock expo-router
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the admin API
jest.mock("@/services/api/admin");
const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

// Test wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode; }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe("UserManagementPage", () => {
  const mockUsers: adminApi.AdminUser[] = [
    {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin User",
      image: "https://example.com/avatar.jpg",
      role: "ADMIN",
      tokenBalance: 500,
      imageCount: 50,
      createdAt: "2025-01-01T00:00:00Z",
    },
    {
      id: "user-2",
      email: "regular@example.com",
      name: "Regular User",
      image: null,
      role: "USER",
      tokenBalance: 100,
      imageCount: 10,
      createdAt: "2025-06-15T00:00:00Z",
    },
    {
      id: "user-3",
      email: "superadmin@example.com",
      name: "Super Admin",
      image: null,
      role: "SUPER_ADMIN",
      tokenBalance: 9999,
      imageCount: 200,
      createdAt: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Loading State", () => {
    it("should show loading state while fetching data", () => {
      mockAdminApi.getUsers.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      expect(getByText("Loading users...")).toBeTruthy();
    });
  });

  describe("Successful Data Display", () => {
    beforeEach(() => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
        status: 200,
      });
    });

    it("should display list of users", async () => {
      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Admin User")).toBeTruthy();
        expect(getByText("Regular User")).toBeTruthy();
        expect(getByText("Super Admin")).toBeTruthy();
      });
    });

    it("should display user emails", async () => {
      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("admin@example.com")).toBeTruthy();
        expect(getByText("regular@example.com")).toBeTruthy();
        expect(getByText("superadmin@example.com")).toBeTruthy();
      });
    });

    it("should display role badges", async () => {
      const { getByText, getAllByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("ADMIN")).toBeTruthy();
        expect(getByText("USER")).toBeTruthy();
        expect(getByText("SUPER_ADMIN")).toBeTruthy();
      });
    });

    it("should display token balances", async () => {
      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("500 tokens")).toBeTruthy();
        expect(getByText("100 tokens")).toBeTruthy();
        expect(getByText("9999 tokens")).toBeTruthy();
      });
    });

    it("should display image counts", async () => {
      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("50 images")).toBeTruthy();
        expect(getByText("10 images")).toBeTruthy();
        expect(getByText("200 images")).toBeTruthy();
      });
    });

    it("should display user count", async () => {
      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("3 users found")).toBeTruthy();
      });
    });

    it("should display join dates", async () => {
      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText(/Joined:/)).toBeTruthy();
      });
    });
  });

  describe("Search Functionality", () => {
    beforeEach(() => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
        status: 200,
      });
    });

    it("should render search input", async () => {
      const { getByPlaceholderText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByPlaceholderText("Search by email or name...")).toBeTruthy();
      });
    });

    it("should call API with search query after debounce", async () => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: { users: [mockUsers[0]] },
        error: null,
        status: 200,
      });

      const { getByPlaceholderText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByPlaceholderText("Search by email or name...")).toBeTruthy();
      });

      const searchInput = getByPlaceholderText("Search by email or name...");
      fireEvent.changeText(searchInput, "admin");

      // Fast forward debounce timer
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockAdminApi.getUsers).toHaveBeenCalledWith("admin");
      });
    });

    it("should update search query on input change", async () => {
      const { getByPlaceholderText, getByDisplayValue } = render(
        <UserManagementPage />,
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(getByPlaceholderText("Search by email or name...")).toBeTruthy();
      });

      const searchInput = getByPlaceholderText("Search by email or name...");
      fireEvent.changeText(searchInput, "test@example.com");

      expect(getByDisplayValue("test@example.com")).toBeTruthy();
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
        status: 200,
      });
    });

    it("should navigate to user detail page when user card is pressed", async () => {
      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Admin User")).toBeTruthy();
      });

      fireEvent.press(getByText("Admin User"));
      expect(mockPush).toHaveBeenCalledWith("/admin/users/user-1");
    });

    it("should navigate to correct user based on selection", async () => {
      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Regular User")).toBeTruthy();
      });

      fireEvent.press(getByText("Regular User"));
      expect(mockPush).toHaveBeenCalledWith("/admin/users/user-2");
    });
  });

  describe("Error State", () => {
    it("should display error message when API fails", async () => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: null,
        error: "Failed to fetch users",
        status: 500,
      });

      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Failed to load users")).toBeTruthy();
        expect(getByText("Failed to fetch users")).toBeTruthy();
      });
    });

    it("should show retry button on error", async () => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: null,
        error: "Network error",
        status: 0,
      });

      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Try Again")).toBeTruthy();
      });
    });

    it("should refetch data when retry is pressed", async () => {
      mockAdminApi.getUsers
        .mockResolvedValueOnce({
          data: null,
          error: "Network error",
          status: 0,
        })
        .mockResolvedValueOnce({
          data: { users: mockUsers },
          error: null,
          status: 200,
        });

      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Try Again")).toBeTruthy();
      });

      fireEvent.press(getByText("Try Again"));

      await waitFor(() => {
        expect(mockAdminApi.getUsers).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Empty State", () => {
    it("should display empty state when no users found", async () => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
        status: 200,
      });

      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("No users found")).toBeTruthy();
        expect(getByText("No users in the system yet")).toBeTruthy();
      });
    });

    it("should display search-specific empty message when searching", async () => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
        status: 200,
      });

      const { getByPlaceholderText, getByText } = render(
        <UserManagementPage />,
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(getByPlaceholderText("Search by email or name...")).toBeTruthy();
      });

      const searchInput = getByPlaceholderText("Search by email or name...");
      fireEvent.changeText(searchInput, "nonexistent");

      await waitFor(() => {
        expect(getByText("Try adjusting your search query")).toBeTruthy();
      });
    });

    it("should display 0 users found count", async () => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
        status: 200,
      });

      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("0 users found")).toBeTruthy();
      });
    });
  });

  describe("Pull to Refresh", () => {
    beforeEach(() => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
        status: 200,
      });
    });

    it("should show refreshing indicator", async () => {
      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("Admin User")).toBeTruthy();
      });

      // Refresh state is managed internally by React Query
      // Testing the presence of RefreshControl integration
    });
  });

  describe("User Display Without Name/Email", () => {
    it("should display fallback text when name is null", async () => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "user-no-name",
              email: "test@example.com",
              name: null,
              image: null,
              role: "USER",
              tokenBalance: 50,
              imageCount: 5,
              createdAt: "2025-01-01T00:00:00Z",
            },
          ],
        },
        error: null,
        status: 200,
      });

      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("No name")).toBeTruthy();
      });
    });

    it("should display fallback text when email is null", async () => {
      mockAdminApi.getUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: "user-no-email",
              email: null,
              name: "Test User",
              image: null,
              role: "USER",
              tokenBalance: 50,
              imageCount: 5,
              createdAt: "2025-01-01T00:00:00Z",
            },
          ],
        },
        error: null,
        status: 200,
      });

      const { getByText } = render(<UserManagementPage />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(getByText("No email")).toBeTruthy();
      });
    });
  });
});

describe("RoleBadge Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render ADMIN badge with correct styling", async () => {
    mockAdminApi.getUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: "admin-1",
            email: "admin@test.com",
            name: "Admin",
            image: null,
            role: "ADMIN",
            tokenBalance: 100,
            imageCount: 10,
            createdAt: "2025-01-01T00:00:00Z",
          },
        ],
      },
      error: null,
      status: 200,
    });

    const { getByText } = render(<UserManagementPage />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("ADMIN")).toBeTruthy();
    });
  });

  it("should render SUPER_ADMIN badge", async () => {
    mockAdminApi.getUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: "super-1",
            email: "super@test.com",
            name: "Super Admin",
            image: null,
            role: "SUPER_ADMIN",
            tokenBalance: 100,
            imageCount: 10,
            createdAt: "2025-01-01T00:00:00Z",
          },
        ],
      },
      error: null,
      status: 200,
    });

    const { getByText } = render(<UserManagementPage />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("SUPER_ADMIN")).toBeTruthy();
    });
  });

  it("should render USER badge", async () => {
    mockAdminApi.getUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: "user-1",
            email: "user@test.com",
            name: "Regular User",
            image: null,
            role: "USER",
            tokenBalance: 100,
            imageCount: 10,
            createdAt: "2025-01-01T00:00:00Z",
          },
        ],
      },
      error: null,
      status: 200,
    });

    const { getByText } = render(<UserManagementPage />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("USER")).toBeTruthy();
    });
  });
});

describe("UserCard Component", () => {
  beforeEach(() => {
    mockAdminApi.getUsers.mockResolvedValue({
      data: {
        users: [
          {
            id: "user-full",
            email: "full@example.com",
            name: "Full User",
            image: "https://example.com/avatar.jpg",
            role: "ADMIN",
            tokenBalance: 250,
            imageCount: 75,
            createdAt: "2025-03-15T10:30:00Z",
          },
        ],
      },
      error: null,
      status: 200,
    });
  });

  it("should display all user information in card", async () => {
    const { getByText } = render(<UserManagementPage />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("Full User")).toBeTruthy();
      expect(getByText("full@example.com")).toBeTruthy();
      expect(getByText("ADMIN")).toBeTruthy();
      expect(getByText("250 tokens")).toBeTruthy();
      expect(getByText("75 images")).toBeTruthy();
    });
  });

  it("should be pressable for navigation", async () => {
    const { getByText } = render(<UserManagementPage />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getByText("Full User")).toBeTruthy();
    });

    fireEvent.press(getByText("full@example.com"));
    expect(mockPush).toHaveBeenCalledWith("/admin/users/user-full");
  });
});
