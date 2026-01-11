import { describe, it, expect, vi, beforeEach } from "vitest";
import { EscalationService } from "./escalation-service";
import prisma from "@/lib/prisma";
import { getSmartRoutingSettings } from "./settings";

vi.mock("@/lib/prisma", () => ({
    default: {
        inboxItem: {
            findUnique: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
        },
        escalationEvent: {
            create: vi.fn(),
        },
    },
}));

vi.mock("./settings", () => ({
    getSmartRoutingSettings: vi.fn(),
}));

describe("EscalationService", () => {
    const service = new EscalationService("ws-1");

    beforeEach(() => {
        vi.clearAllMocks();
        (getSmartRoutingSettings as any).mockResolvedValue({
            escalation: {
                levels: [
                    { level: 1, name: "L1", notifyChannels: ["slack"], triggerDelayMinutes: 0 },
                    { level: 2, name: "L2", maxTimeMinutes: 60, notifyChannels: ["email"], triggerDelayMinutes: 0 }
                ],
                slaTimeoutMinutes: 120,
            },
        });
    });

    it("should trigger escalation successfully", async () => {
        (prisma.inboxItem.findUnique as any).mockResolvedValue({
            id: "item-1",
            escalationLevel: 0,
        });

        (prisma.inboxItem.update as any).mockResolvedValue({ id: "item-1" });

        await service.escalateItem("item-1", "MANUAL", "Test");

        expect(prisma.inboxItem.update).toHaveBeenCalledWith({
            where: { id: "item-1" },
            data: expect.objectContaining({
                escalationLevel: 1,
                escalationStatus: "ESCALATED",
            }),
        });
    });

    it("should not escalate beyond max level", async () => {
        (prisma.inboxItem.findUnique as any).mockResolvedValue({
            id: "item-1",
            escalationLevel: 2,
        });

        await service.escalateItem("item-1", "MANUAL", "Test");

        expect(prisma.inboxItem.update).not.toHaveBeenCalled();
    });
});
