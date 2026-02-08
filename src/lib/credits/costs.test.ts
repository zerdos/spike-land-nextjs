import { describe, expect, it } from "vitest";
import { ENHANCEMENT_COSTS, getEnhancementCost, EnhancementTier } from "./costs";

describe("Credit Costs", () => {
    describe("ENHANCEMENT_COSTS constant", () => {
        it("should define costs for all tiers", () => {
            expect(ENHANCEMENT_COSTS).toHaveProperty("TIER_1K");
            expect(ENHANCEMENT_COSTS).toHaveProperty("TIER_2K");
            expect(ENHANCEMENT_COSTS).toHaveProperty("TIER_4K");
        });

        it("should have correct cost values", () => {
            expect(ENHANCEMENT_COSTS.TIER_1K).toBe(2);
            expect(ENHANCEMENT_COSTS.TIER_2K).toBe(5);
            expect(ENHANCEMENT_COSTS.TIER_4K).toBe(10);
        });

        it("should have costs in ascending order by tier", () => {
            expect(ENHANCEMENT_COSTS.TIER_1K).toBeLessThan(
                ENHANCEMENT_COSTS.TIER_2K,
            );
            expect(ENHANCEMENT_COSTS.TIER_2K).toBeLessThan(
                ENHANCEMENT_COSTS.TIER_4K,
            );
        });
    });

    describe("getEnhancementCost function", () => {
        it("should return correct cost for TIER_1K", () => {
            const cost = getEnhancementCost("TIER_1K");
            expect(cost).toBe(2);
        });

        it("should return correct cost for TIER_2K", () => {
            const cost = getEnhancementCost("TIER_2K");
            expect(cost).toBe(5);
        });

        it("should return correct cost for TIER_4K", () => {
            const cost = getEnhancementCost("TIER_4K");
            expect(cost).toBe(10);
        });

        it("should accept type-safe tier argument", () => {
            const tier: EnhancementTier = "TIER_2K";
            const cost = getEnhancementCost(tier);
            expect(cost).toBe(5);
        });
    });
});
