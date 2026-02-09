import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@/auth", () => ({
    auth: vi.fn(),
}));

// Mock WorkspaceCreditManager
vi.mock("@/lib/credits/workspace-credit-manager", () => ({
    WorkspaceCreditManager: {
        getBalance: vi.fn(),
    },
}));

import { auth } from "@/auth";
import { WorkspaceCreditManager } from "@/lib/credits/workspace-credit-manager";
import { GET } from "./route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGetBalance = WorkspaceCreditManager.getBalance as ReturnType<typeof vi.fn>;

describe("/api/credits/balance", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 401 if not authenticated", async () => {
        mockAuth.mockResolvedValue(null);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Authentication required");
    });

    it("returns credit balance for authenticated user", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-1" } });
        mockGetBalance.mockResolvedValue({
            remaining: 80,
            limit: 100,
            used: 20,
            tier: "PRO",
            workspaceId: "ws-1",
        });

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
            remaining: 80,
            limit: 100,
            used: 20,
            tier: "PRO",
            workspaceId: "ws-1",
        });
        expect(mockGetBalance).toHaveBeenCalledWith("user-1");
    });

    it("returns 500 if balance retrieval fails", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-1" } });
        mockGetBalance.mockResolvedValue(null);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Unable to retrieve credit balance");
    });
});
