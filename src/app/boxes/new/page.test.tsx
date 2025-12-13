import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to define mocks before they are hoisted
const { mockAuth, mockPrisma, mockRedirect } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    boxTier: {
      findMany: vi.fn(),
    },
  },
  mockRedirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
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
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/boxes/create-box-form", () => ({
  CreateBoxForm: ({ tiers }: { tiers: unknown[]; }) => (
    <div data-testid="create-box-form">
      <span data-testid="tiers-count">{tiers.length}</span>
      <span data-testid="tiers-data">{JSON.stringify(tiers)}</span>
    </div>
  ),
}));

// Import after mocks are set up
import NewBoxPage from "./page";

describe("NewBoxPage", () => {
  const mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    },
  };

  const mockTiers = [
    {
      id: "tier-1",
      name: "Basic",
      description: "Basic tier for testing",
      cpu: 1,
      ram: 1024,
      storage: 10,
      pricePerHour: 5,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: "tier-2",
      name: "Standard",
      description: "Standard tier for testing",
      cpu: 2,
      ram: 2048,
      storage: 20,
      pricePerHour: 10,
      isActive: true,
      sortOrder: 2,
    },
    {
      id: "tier-3",
      name: "Premium",
      description: "Premium tier for testing",
      cpu: 4,
      ram: 4096,
      storage: 40,
      pricePerHour: 20,
      isActive: true,
      sortOrder: 3,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to signin if user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(NewBoxPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("renders the page with CreateBoxForm when authenticated", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockPrisma.boxTier.findMany.mockResolvedValue(mockTiers);

    render(await NewBoxPage());

    expect(screen.getByText("Create New Box")).toBeInTheDocument();
    expect(
      screen.getByText("Configure your remote desktop environment"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("create-box-form")).toBeInTheDocument();
  });

  it("fetches active tiers ordered by sortOrder", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockPrisma.boxTier.findMany.mockResolvedValue(mockTiers);

    render(await NewBoxPage());

    expect(mockPrisma.boxTier.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  });

  it("passes tiers to CreateBoxForm component", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockPrisma.boxTier.findMany.mockResolvedValue(mockTiers);

    render(await NewBoxPage());

    expect(screen.getByTestId("tiers-count")).toHaveTextContent("3");
    const tiersData = JSON.parse(
      screen.getByTestId("tiers-data").textContent || "[]",
    );
    expect(tiersData).toHaveLength(3);
    expect(tiersData[0].name).toBe("Basic");
    expect(tiersData[1].name).toBe("Standard");
    expect(tiersData[2].name).toBe("Premium");
  });

  it("renders page with empty tiers array when no tiers exist", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockPrisma.boxTier.findMany.mockResolvedValue([]);

    render(await NewBoxPage());

    expect(screen.getByTestId("create-box-form")).toBeInTheDocument();
    expect(screen.getByTestId("tiers-count")).toHaveTextContent("0");
  });

  it("renders page with single tier", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockPrisma.boxTier.findMany.mockResolvedValue([mockTiers[0]]);

    render(await NewBoxPage());

    expect(screen.getByTestId("tiers-count")).toHaveTextContent("1");
    const tiersData = JSON.parse(
      screen.getByTestId("tiers-data").textContent || "[]",
    );
    expect(tiersData).toHaveLength(1);
    expect(tiersData[0].name).toBe("Basic");
  });

  it("renders correct page structure and styling", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockPrisma.boxTier.findMany.mockResolvedValue(mockTiers);

    const { container } = render(await NewBoxPage());

    // Check main wrapper div has correct classes
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass("min-h-screen", "bg-background");

    // Check container div
    const containerDiv = mainDiv?.firstChild as HTMLElement;
    expect(containerDiv).toHaveClass("container", "mx-auto", "px-4", "max-w-4xl");
  });

  it("renders heading with correct styling", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockPrisma.boxTier.findMany.mockResolvedValue(mockTiers);

    render(await NewBoxPage());

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Create New Box");
    expect(heading).toHaveClass("text-3xl", "font-bold", "tracking-tight");
  });

  it("renders subtitle with correct styling", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockPrisma.boxTier.findMany.mockResolvedValue(mockTiers);

    render(await NewBoxPage());

    const subtitle = screen.getByText(
      "Configure your remote desktop environment",
    );
    expect(subtitle).toHaveClass("mt-2", "text-muted-foreground");
  });
});
