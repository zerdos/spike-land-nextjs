import { BoxStatus } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks before they are hoisted
const { mockAuth, mockPrisma, mockRedirect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    box: {
      findMany: vi.fn(),
    },
  },
  mockRedirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// Mock the BoxCard component to simplify testing
vi.mock("@/components/boxes/box-card", () => ({
  BoxCard: ({ box }: { box: { id: string; name: string; }; }) => (
    <div data-testid={`box-card-${box.id}`}>{box.name}</div>
  ),
}));

// Import after mocks are set up
import BoxesPage from "./page";

describe("BoxesPage", () => {
  const mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    },
    expires: "2025-12-31",
  };

  const mockTier = {
    id: "tier-1",
    name: "Basic",
    cpu: 2,
    ram: 2048,
    storage: 10,
    pricePerHour: 1,
    stripePriceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBox = {
    id: "box-123",
    name: "Test Box",
    description: "Test Description",
    userId: "user-123",
    tierId: "tier-1",
    status: BoxStatus.RUNNING,
    connectionUrl: "https://example.com/vnc",
    storageVolumeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    tier: mockTier,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should redirect to signin when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(BoxesPage()).rejects.toThrow("REDIRECT:/auth/signin");
      expect(mockAuth).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
    });

    it("should not redirect when user is authenticated", async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockPrisma.box.findMany.mockResolvedValue([]);

      const result = await BoxesPage();

      expect(mockAuth).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should fetch boxes for authenticated user", async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockPrisma.box.findMany.mockResolvedValue([]);

      await BoxesPage();

      expect(mockPrisma.box.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          deletedAt: null,
        },
        include: {
          tier: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    });
  });

  describe("Empty State", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
      mockPrisma.box.findMany.mockResolvedValue([]);
    });

    it("should render page title", async () => {
      const component = await BoxesPage();
      render(component);

      expect(screen.getByText("My Boxes")).toBeInTheDocument();
    });

    it("should render page description", async () => {
      const component = await BoxesPage();
      render(component);

      expect(
        screen.getByText("Manage your browser agent boxes"),
      ).toBeInTheDocument();
    });

    it("should render empty state when no boxes", async () => {
      const component = await BoxesPage();
      render(component);

      expect(screen.getByText("No boxes yet")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Get started by creating your first remote browser box",
        ),
      ).toBeInTheDocument();
    });

    it("should render Create New Box button in header", async () => {
      const component = await BoxesPage();
      render(component);

      const buttons = screen.getAllByText("Create New Box");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should render Create Your First Box button in empty state", async () => {
      const component = await BoxesPage();
      render(component);

      expect(screen.getByText("Create Your First Box")).toBeInTheDocument();
    });
  });

  describe("Boxes List", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
    });

    it("should render boxes when they exist", async () => {
      mockPrisma.box.findMany.mockResolvedValue([mockBox]);

      const component = await BoxesPage();
      render(component);

      expect(screen.getByTestId("box-card-box-123")).toBeInTheDocument();
      expect(screen.getByText("Test Box")).toBeInTheDocument();
    });

    it("should render multiple boxes", async () => {
      const boxes = [
        mockBox,
        {
          ...mockBox,
          id: "box-456",
          name: "Second Box",
          tier: mockTier,
        },
      ];
      mockPrisma.box.findMany.mockResolvedValue(boxes);

      const component = await BoxesPage();
      render(component);

      expect(screen.getByTestId("box-card-box-123")).toBeInTheDocument();
      expect(screen.getByTestId("box-card-box-456")).toBeInTheDocument();
      expect(screen.getByText("Test Box")).toBeInTheDocument();
      expect(screen.getByText("Second Box")).toBeInTheDocument();
    });

    it("should filter out boxes with null tier", async () => {
      const boxWithNullTier = {
        ...mockBox,
        id: "box-null-tier",
        name: "Box Without Tier",
        tier: null,
      };
      mockPrisma.box.findMany.mockResolvedValue([mockBox, boxWithNullTier]);

      const component = await BoxesPage();
      render(component);

      // Only the box with tier should be rendered
      expect(screen.getByTestId("box-card-box-123")).toBeInTheDocument();
      expect(screen.queryByTestId("box-card-box-null-tier")).not
        .toBeInTheDocument();
    });

    it("should not render empty state when boxes exist", async () => {
      mockPrisma.box.findMany.mockResolvedValue([mockBox]);

      const component = await BoxesPage();
      render(component);

      expect(screen.queryByText("No boxes yet")).not.toBeInTheDocument();
    });
  });

  describe("Link Navigation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockSession);
    });

    it("should have link to create new box in header", async () => {
      mockPrisma.box.findMany.mockResolvedValue([]);

      const component = await BoxesPage();
      render(component);

      const links = document.querySelectorAll('a[href="/boxes/new"]');
      expect(links.length).toBeGreaterThan(0);
    });

    it("should have link to create new box in empty state", async () => {
      mockPrisma.box.findMany.mockResolvedValue([]);

      const component = await BoxesPage();
      render(component);

      const links = document.querySelectorAll('a[href="/boxes/new"]');
      // There should be two links - one in header and one in empty state
      expect(links.length).toBe(2);
    });
  });
});
