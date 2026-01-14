import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyAppsPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    app: {
      findMany: vi.fn(),
    },
  },
}));

const mockAuth = vi.mocked(auth);
const mockRedirect = vi.mocked(redirect);
const mockFindMany = vi.mocked(prisma.app.findMany);

// Helper to create mock app data matching new schema
function createMockApp(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  description: string;
  userId: string;
  status:
    | "PROMPTING"
    | "WAITING"
    | "DRAFTING"
    | "BUILDING"
    | "FINE_TUNING"
    | "TEST"
    | "LIVE"
    | "ARCHIVED"
    | "FAILED";
  forkedFrom: string | null;
  domain: string | null;
  codespaceId: string | null;
  codespaceUrl: string | null;
  isCurated: boolean;
  isPublic: boolean;
  lastAgentActivity: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { messages: number; images: number; };
}> = {}) {
  return {
    id: "app-1",
    name: "Test App",
    slug: "test-app",
    description: "Test description",
    userId: "user-123",
    status: "PROMPTING" as const,
    forkedFrom: null,
    domain: null,
    codespaceId: null,
    codespaceUrl: null,
    isCurated: false,
    isPublic: false,
    lastAgentActivity: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    _count: { messages: 0, images: 0 },
    ...overrides,
  };
}

describe("MyAppsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should redirect to signin when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      mockRedirect.mockImplementation((url: string) => {
        throw new Error(`REDIRECT:${url}`);
      });

      try {
        await MyAppsPage();
      } catch (error) {
        expect((error as Error).message).toBe("REDIRECT:/auth/signin");
      }

      expect(mockAuth).toHaveBeenCalled();
    });

    it("should not redirect when user is authenticated", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "123",
          name: "Test User",
          email: "test@example.com",
          role: "USER",
        },
        expires: "2025-12-31",
      });

      mockFindMany.mockResolvedValue([]);

      const result = await MyAppsPage();

      expect(mockAuth).toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should fetch apps for authenticated user with correct query", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "USER",
        },
        expires: "2025-12-31",
      });

      mockFindMany.mockResolvedValue([]);

      await MyAppsPage();

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          status: {
            notIn: ["ARCHIVED"],
          },
          messages: {
            some: {}, // Only show apps that have at least one message
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          status: true,
          codespaceId: true,
          codespaceUrl: true,
          isCurated: true,
          isPublic: true,
          lastAgentActivity: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              messages: true,
              images: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    });
  });

  describe("Empty State", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: "123",
          name: "Test User",
          email: "test@example.com",
          role: "USER",
        },
        expires: "2025-12-31",
      });
      mockFindMany.mockResolvedValue([]);
    });

    it("should render page title", async () => {
      const component = await MyAppsPage();
      render(component);

      expect(screen.getByText("My Apps")).toBeInTheDocument();
    });

    it("should render page description", async () => {
      const component = await MyAppsPage();
      render(component);

      expect(
        screen.getByText("Manage and deploy your vibe-coded applications"),
      ).toBeInTheDocument();
    });

    it("should render empty state when no apps", async () => {
      const component = await MyAppsPage();
      render(component);

      expect(screen.getByText("No apps yet")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Get started by creating your first vibe-coded application",
        ),
      ).toBeInTheDocument();
    });

    it("should render Create New App button", async () => {
      const component = await MyAppsPage();
      render(component);

      const buttons = screen.getAllByText("Create New App");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("Apps List", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "USER",
        },
        expires: "2025-12-31",
      });
    });

    it("should render apps when they exist", async () => {
      const mockApps = [
        createMockApp({
          id: "app-1",
          name: "Test App 1",
          slug: "test-app-1",
          description: "Description 1",
          status: "PROMPTING",
          _count: { messages: 3, images: 1 },
        }),
        createMockApp({
          id: "app-2",
          name: "Test App 2",
          slug: "test-app-2",
          description: "Description 2",
          status: "LIVE",
          codespaceId: "test-app-2",
          codespaceUrl: "https://testing.spike.land/live/test-app-2/",
          _count: { messages: 10, images: 5 },
        }),
      ];

      mockFindMany.mockResolvedValue(mockApps);

      const component = await MyAppsPage();
      render(component);

      expect(screen.getByText("Test App 1")).toBeInTheDocument();
      expect(screen.getByText("Test App 2")).toBeInTheDocument();
      expect(screen.getByText("Description 1")).toBeInTheDocument();
      expect(screen.getByText("Description 2")).toBeInTheDocument();
    });

    it("should display app status badges", async () => {
      const mockApps = [
        createMockApp({
          id: "app-1",
          name: "Prompting App",
          status: "PROMPTING",
        }),
        createMockApp({
          id: "app-2",
          name: "Live App",
          status: "LIVE",
        }),
      ];

      mockFindMany.mockResolvedValue(mockApps);

      const component = await MyAppsPage();
      render(component);

      expect(screen.getByText("PROMPTING")).toBeInTheDocument();
      expect(screen.getByText("LIVE")).toBeInTheDocument();
    });

    it("should display message count", async () => {
      const mockApps = [
        createMockApp({
          id: "app-1",
          name: "Test App",
          _count: { messages: 5, images: 2 },
        }),
      ];

      mockFindMany.mockResolvedValue(mockApps);

      const component = await MyAppsPage();
      render(component);

      // New 3D cards show "5 messages" format
      expect(screen.getByText("5 messages")).toBeInTheDocument();
    });

    it("should display image count", async () => {
      const mockApps = [
        createMockApp({
          id: "app-1",
          name: "Test App",
          _count: { messages: 3, images: 7 },
        }),
      ];

      mockFindMany.mockResolvedValue(mockApps);

      const component = await MyAppsPage();
      render(component);

      // New 3D cards show "7 images" format
      expect(screen.getByText("7 images")).toBeInTheDocument();
    });

    it("should show filter badges with counts", async () => {
      const mockApps = [
        createMockApp({
          id: "app-1",
          name: "App 1",
          status: "PROMPTING",
        }),
        createMockApp({
          id: "app-2",
          name: "App 2",
          status: "LIVE",
        }),
        createMockApp({
          id: "app-3",
          name: "App 3",
          status: "LIVE",
        }),
      ];

      mockFindMany.mockResolvedValue(mockApps);

      const component = await MyAppsPage();
      render(component);

      expect(screen.getByText(/All \(3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Live \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Building \(1\)/)).toBeInTheDocument();
    });

    it("should show iframe preview for apps with codespaceUrl", async () => {
      const mockApps = [
        createMockApp({
          id: "app-1",
          name: "Live App",
          status: "LIVE",
          codespaceId: "live-app",
          codespaceUrl: "https://testing.spike.land/live/live-app/",
        }),
      ];

      mockFindMany.mockResolvedValue(mockApps);

      const component = await MyAppsPage();
      render(component);

      // New 3D cards show live iframe preview
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toBe("https://testing.spike.land/live/live-app/");
    });

    it("should show placeholder for apps without codespaceUrl", async () => {
      const mockApps = [
        createMockApp({
          id: "app-1",
          name: "Draft App",
          status: "PROMPTING",
          codespaceUrl: null,
        }),
      ];

      mockFindMany.mockResolvedValue(mockApps);

      const component = await MyAppsPage();
      render(component);

      // No iframe when codespaceUrl is null - shows placeholder
      expect(screen.getByText("No preview")).toBeInTheDocument();
    });

    it("should display app card for failed status app", async () => {
      const mockApps = [
        createMockApp({
          id: "app-1",
          name: "Failed App",
          description: "A failed app description",
          status: "FAILED",
        }),
      ];

      mockFindMany.mockResolvedValue(mockApps);

      const component = await MyAppsPage();
      render(component);

      // App card is rendered with description visible (status badge was removed from design)
      expect(screen.getByText("A failed app description")).toBeInTheDocument();
    });
  });
});
