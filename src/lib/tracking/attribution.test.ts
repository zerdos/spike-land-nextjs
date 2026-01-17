/**
 * Campaign Attribution Tests
 *
 * Tests for multi-touch attribution tracking including first-touch,
 * last-touch, and conversion attribution.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    campaignAttribution: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    visitorSession: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    campaignLink: {
      findUnique: vi.fn(),
    },
  },
}));

// Import after mocking
import prisma from "@/lib/prisma";
import {
  attributeConversion,
  type AttributionParams,
  createAttribution,
  getAllAttributions,
  getCampaignAttributionSummary,
  getFirstTouchAttribution,
  getLastTouchAttribution,
  hasExistingAttribution,
} from "./attribution";

describe("attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAttribution", () => {
    it("should create an attribution record with all fields", async () => {
      vi.mocked(prisma.campaignAttribution.create).mockResolvedValue({
        id: "attr-123",
        userId: "user-123",
        sessionId: "session-123",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: 100,
        platform: "GOOGLE_ADS",
        externalCampaignId: "gclid-123",
        utmCampaign: "brand",
        utmSource: "google",
        utmMedium: "cpc",
        convertedAt: new Date(),
      });

      const params: AttributionParams = {
        userId: "user-123",
        sessionId: "session-123",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: 100,
        platform: "GOOGLE_ADS",
        externalCampaignId: "gclid-123",
        utmParams: {
          utm_source: "google",
          utm_medium: "cpc",
          utm_campaign: "brand",
        },
      };

      await createAttribution(params);

      expect(prisma.campaignAttribution.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          sessionId: "session-123",
          conversionId: "conv-123",
          attributionType: "FIRST_TOUCH",
          conversionType: "SIGNUP",
          conversionValue: 100,
          platform: "GOOGLE_ADS",
          externalCampaignId: "gclid-123",
          utmCampaign: "brand",
          utmSource: "google",
          utmMedium: "cpc",
        },
      });
    });

    it("should derive platform from UTM params when not provided", async () => {
      vi.mocked(prisma.campaignAttribution.create).mockResolvedValue({
        id: "attr-123",
        userId: "user-123",
        sessionId: "session-123",
        conversionId: "conv-123",
        attributionType: "LAST_TOUCH",
        conversionType: "ENHANCEMENT",
        conversionValue: null,
        platform: "FACEBOOK",
        externalCampaignId: null,
        utmCampaign: "promo",
        utmSource: "facebook",
        utmMedium: "social",
        convertedAt: new Date(),
      });

      await createAttribution({
        userId: "user-123",
        sessionId: "session-123",
        conversionId: "conv-123",
        attributionType: "LAST_TOUCH",
        conversionType: "ENHANCEMENT",
        utmParams: {
          utm_source: "facebook",
          utm_medium: "social",
          utm_campaign: "promo",
        },
      });

      expect(prisma.campaignAttribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: "FACEBOOK",
        }),
      });
    });

    it("should use DIRECT platform when no UTM params", async () => {
      vi.mocked(prisma.campaignAttribution.create).mockResolvedValue({
        id: "attr-123",
        userId: "user-123",
        sessionId: "session-123",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "PURCHASE",
        conversionValue: 9.99,
        platform: "DIRECT",
        externalCampaignId: null,
        utmCampaign: null,
        utmSource: null,
        utmMedium: null,
        convertedAt: new Date(),
      });

      await createAttribution({
        userId: "user-123",
        sessionId: "session-123",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "PURCHASE",
        conversionValue: 9.99,
      });

      expect(prisma.campaignAttribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: "DIRECT",
        }),
      });
    });

    it("should detect GOOGLE_ADS from gclid in UTM params", async () => {
      vi.mocked(prisma.campaignAttribution.create).mockResolvedValue({
        id: "attr-123",
        userId: "user-123",
        sessionId: "session-123",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: null,
        platform: "GOOGLE_ADS",
        externalCampaignId: null,
        utmCampaign: null,
        utmSource: null,
        utmMedium: null,
        convertedAt: new Date(),
      });

      await createAttribution({
        userId: "user-123",
        sessionId: "session-123",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        utmParams: {
          gclid: "abc123",
        },
      });

      expect(prisma.campaignAttribution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: "GOOGLE_ADS",
        }),
      });
    });
  });

  describe("getFirstTouchAttribution", () => {
    it("should return first-touch attribution for user", async () => {
      const mockAttribution = {
        id: "attr-first",
        userId: "user-123",
        sessionId: "session-1",
        attributionType: "FIRST_TOUCH" as const,
        conversionType: "SIGNUP" as const,
        conversionValue: null,
        platform: "GOOGLE_ADS",
        externalCampaignId: null,
        utmCampaign: "brand",
        utmSource: "google",
        utmMedium: "cpc",
        convertedAt: new Date("2024-01-01"),
        conversionId: "conv-1",
      };

      vi.mocked(prisma.campaignAttribution.findFirst).mockResolvedValue(
        mockAttribution,
      );

      const result = await getFirstTouchAttribution("user-123");

      expect(result).toEqual(mockAttribution);
      expect(prisma.campaignAttribution.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          attributionType: "FIRST_TOUCH",
        },
        orderBy: {
          convertedAt: "asc",
        },
      });
    });

    it("should return null when no attribution exists", async () => {
      vi.mocked(prisma.campaignAttribution.findFirst).mockResolvedValue(null);

      const result = await getFirstTouchAttribution("user-without-attr");

      expect(result).toBeNull();
    });
  });

  describe("getLastTouchAttribution", () => {
    it("should return last-touch attribution for user", async () => {
      const mockAttribution = {
        id: "attr-last",
        userId: "user-123",
        sessionId: "session-5",
        attributionType: "LAST_TOUCH" as const,
        conversionType: "PURCHASE" as const,
        conversionValue: 9.99,
        platform: "FACEBOOK",
        externalCampaignId: null,
        utmCampaign: "retargeting",
        utmSource: "facebook",
        utmMedium: "paid",
        convertedAt: new Date("2024-01-15"),
        conversionId: "conv-2",
      };

      vi.mocked(prisma.campaignAttribution.findFirst).mockResolvedValue(
        mockAttribution,
      );

      const result = await getLastTouchAttribution("user-123");

      expect(result).toEqual(mockAttribution);
      expect(prisma.campaignAttribution.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          attributionType: "LAST_TOUCH",
        },
        orderBy: {
          convertedAt: "desc",
        },
      });
    });

    it("should return null when no attribution exists", async () => {
      vi.mocked(prisma.campaignAttribution.findFirst).mockResolvedValue(null);

      const result = await getLastTouchAttribution("user-without-attr");

      expect(result).toBeNull();
    });
  });

  describe("getAllAttributions", () => {
    it("should return all attributions for user", async () => {
      const mockAttributions = [
        {
          id: "attr-1",
          userId: "user-123",
          sessionId: "session-1",
          attributionType: "FIRST_TOUCH" as const,
          conversionType: "SIGNUP" as const,
          conversionValue: null,
          platform: "GOOGLE_ADS",
          externalCampaignId: null,
          utmCampaign: "brand",
          utmSource: "google",
          utmMedium: "cpc",
          convertedAt: new Date("2024-01-01"),
          conversionId: "conv-1",
        },
        {
          id: "attr-2",
          userId: "user-123",
          sessionId: "session-2",
          attributionType: "LAST_TOUCH" as const,
          conversionType: "PURCHASE" as const,
          conversionValue: 9.99,
          platform: "DIRECT",
          externalCampaignId: null,
          utmCampaign: null,
          utmSource: null,
          utmMedium: null,
          convertedAt: new Date("2024-01-15"),
          conversionId: "conv-2",
        },
      ];

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue(
        mockAttributions,
      );

      const result = await getAllAttributions("user-123");

      expect(result).toEqual(mockAttributions);
      expect(prisma.campaignAttribution.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { convertedAt: "desc" },
      });
    });

    it("should return empty array when no attributions", async () => {
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const result = await getAllAttributions("user-no-attr");

      expect(result).toEqual([]);
    });
  });

  describe("attributeConversion", () => {
    it("should create first-touch, last-touch, and linear attributions", async () => {
      const mockSessions = [
        {
          id: "session-1",
          visitorId: "v_visitor-123",
          userId: "user-123",
          sessionStart: new Date("2024-01-01"),
          sessionEnd: null,
          deviceType: null,
          browser: null,
          os: null,
          ipCountry: null,
          ipCity: null,
          referrer: "https://google.com",
          landingPage: "/",
          exitPage: "/about",
          pageViewCount: 3,
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "brand",
          utmTerm: null,
          utmContent: null,
          gclid: "abc123",
          fbclid: null,
        },
        {
          id: "session-2",
          visitorId: "v_visitor-123",
          userId: "user-123",
          sessionStart: new Date("2024-01-15"),
          sessionEnd: null,
          deviceType: null,
          browser: null,
          os: null,
          ipCountry: null,
          ipCity: null,
          referrer: null,
          landingPage: "/pricing",
          exitPage: "/checkout",
          pageViewCount: 5,
          utmSource: "facebook",
          utmMedium: "social",
          utmCampaign: "promo",
          utmTerm: null,
          utmContent: null,
          gclid: null,
          fbclid: null,
        },
      ];

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions);

      await attributeConversion("user-123", "SIGNUP", 100);

      expect(prisma.campaignAttribution.create).toHaveBeenCalledTimes(4); // FT, LT, Linear x2

      const calls = vi.mocked(prisma.campaignAttribution.create).mock.calls;
      const conversionId = calls[0]![0]!.data!.conversionId;

      // All calls should have the same conversionId
      calls.forEach((call) => {
        expect(call[0]!.data!.conversionId).toBe(conversionId);
      });

      // First Touch
      expect(calls[0]![0]!.data).toMatchObject({
        attributionType: "FIRST_TOUCH",
        sessionId: "session-1",
        platform: "GOOGLE_ADS",
        conversionValue: 100,
      });

      // Last Touch
      expect(calls[1]![0]!.data).toMatchObject({
        attributionType: "LAST_TOUCH",
        sessionId: "session-2",
        platform: "FACEBOOK",
        conversionValue: 100,
      });

      // Linear
      expect(calls[2]![0]!.data).toMatchObject({
        attributionType: "LINEAR",
        sessionId: "session-1",
        platform: "GOOGLE_ADS",
        conversionValue: 50,
      });
      expect(calls[3]![0]!.data).toMatchObject({
        attributionType: "LINEAR",
        sessionId: "session-2",
        platform: "FACEBOOK",
        conversionValue: 50,
      });
    });

    it("should include conversion value when provided", async () => {
      const mockSessions = [
        {
          id: "session-1",
          visitorId: "v_visitor-123",
          userId: "user-123",
          sessionStart: new Date("2024-01-01"),
          sessionEnd: null,
          deviceType: null,
          browser: null,
          os: null,
          ipCountry: null,
          ipCity: null,
          referrer: null,
          landingPage: "/",
          exitPage: "/",
          pageViewCount: 1,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          utmTerm: null,
          utmContent: null,
          gclid: null,
          fbclid: null,
        },
      ];

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.campaignAttribution.create).mockResolvedValue({
        id: "attr-123",
        userId: "user-123",
        sessionId: "session-1",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "PURCHASE",
        conversionValue: 9.99,
        platform: "DIRECT",
        externalCampaignId: null,
        utmCampaign: null,
        utmSource: null,
        utmMedium: null,
        convertedAt: new Date(),
      });

      await attributeConversion("user-123", "PURCHASE", 9.99);

      // FT, LT, Linear
      expect(prisma.campaignAttribution.create).toHaveBeenCalledTimes(3);
      expect(
        vi.mocked(prisma.campaignAttribution.create).mock.calls.every(
          (c) => c[0]!.data!.conversionValue === 9.99,
        ),
      ).toBe(true);
    });

    it("should create direct attribution when no sessions exist", async () => {
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        emailVerified: null,
        image: null,
        role: "USER",
        referralCode: null,
        referredById: null,
        referralCount: 0,
        stripeCustomerId: null,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.visitorSession.create).mockResolvedValue({
        id: "direct-session-123",
        visitorId: "direct_user-123",
        userId: "user-123",
        sessionStart: new Date(),
        sessionEnd: null,
        deviceType: null,
        browser: null,
        os: null,
        ipCountry: null,
        ipCity: null,
        referrer: null,
        landingPage: "/",
        exitPage: null,
        pageViewCount: 0,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        gclid: null,
        fbclid: null,
      });
      vi.mocked(prisma.campaignAttribution.createMany).mockResolvedValue({
        count: 2,
      });

      await attributeConversion("user-123", "SIGNUP");

      expect(prisma.visitorSession.create).toHaveBeenCalledWith({
        data: {
          visitorId: "direct_user-123",
          userId: "user-123",
          landingPage: "/",
          pageViewCount: 0,
        },
      });
      expect(prisma.campaignAttribution.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ attributionType: "FIRST_TOUCH" }),
          expect.objectContaining({ attributionType: "LAST_TOUCH" }),
          expect.objectContaining({ attributionType: "LINEAR" }),
        ],
      });
    });

    it("should log warning when user not found and no sessions", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await attributeConversion("non-existent-user", "SIGNUP");

      expect(consoleSpy).toHaveBeenCalledWith(
        "No user found for attribution: non-existent-user",
      );
      consoleSpy.mockRestore();
    });

    it("should detect FACEBOOK platform from fbclid", async () => {
      const mockSessions = [
        {
          id: "session-1",
          visitorId: "v_visitor-123",
          userId: "user-123",
          sessionStart: new Date("2024-01-01"),
          sessionEnd: null,
          deviceType: null,
          browser: null,
          os: null,
          ipCountry: null,
          ipCity: null,
          referrer: null,
          landingPage: "/",
          exitPage: "/",
          pageViewCount: 1,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          utmTerm: null,
          utmContent: null,
          gclid: null,
          fbclid: "fb-click-id",
        },
      ];

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.campaignAttribution.create).mockResolvedValue({
        id: "attr-123",
        userId: "user-123",
        sessionId: "session-1",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: null,
        platform: "FACEBOOK",
        externalCampaignId: "fb-click-id",
        utmCampaign: null,
        utmSource: null,
        utmMedium: null,
        convertedAt: new Date(),
      });

      await attributeConversion("user-123", "SIGNUP");

      const createCalls = vi.mocked(prisma.campaignAttribution.create).mock
        .calls;

      // Check that FT, LT, and Linear calls have correct platform
      expect(createCalls[0]![0]!.data).toMatchObject({
        platform: "FACEBOOK",
        externalCampaignId: "fb-click-id",
      });
      expect(createCalls[1]![0]!.data).toMatchObject({
        platform: "FACEBOOK",
        externalCampaignId: "fb-click-id",
      });
      expect(createCalls[2]![0]!.data).toMatchObject({
        platform: "FACEBOOK",
        externalCampaignId: "fb-click-id",
      });
    });

    it("should detect ORGANIC from search engine referrer", async () => {
      const mockSessions = [
        {
          id: "session-1",
          visitorId: "v_visitor-123",
          userId: "user-123",
          sessionStart: new Date("2024-01-01"),
          sessionEnd: null,
          deviceType: null,
          browser: null,
          os: null,
          ipCountry: null,
          ipCity: null,
          referrer: "https://www.google.com/search?q=spike+land",
          landingPage: "/",
          exitPage: "/",
          pageViewCount: 1,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          utmTerm: null,
          utmContent: null,
          gclid: null,
          fbclid: null,
        },
      ];

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.campaignAttribution.create).mockResolvedValue({
        id: "attr-123",
        userId: "user-123",
        sessionId: "session-1",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: null,
        platform: "ORGANIC",
        externalCampaignId: null,
        utmCampaign: null,
        utmSource: null,
        utmMedium: null,
        convertedAt: new Date(),
      });

      await attributeConversion("user-123", "SIGNUP");

      expect(prisma.campaignAttribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            platform: "ORGANIC",
          }),
        }),
      );
    });

    it("should detect OTHER from utm source without major platform match", async () => {
      const mockSessions = [
        {
          id: "session-1",
          visitorId: "v_visitor-123",
          userId: "user-123",
          sessionStart: new Date("2024-01-01"),
          sessionEnd: null,
          deviceType: null,
          browser: null,
          os: null,
          ipCountry: null,
          ipCity: null,
          referrer: null,
          landingPage: "/",
          exitPage: "/",
          pageViewCount: 1,
          utmSource: "newsletter",
          utmMedium: "email",
          utmCampaign: "weekly",
          utmTerm: null,
          utmContent: null,
          gclid: null,
          fbclid: null,
        },
      ];

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.campaignAttribution.create).mockResolvedValue({
        id: "attr-123",
        userId: "user-123",
        sessionId: "session-1",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: null,
        platform: "OTHER",
        externalCampaignId: null,
        utmCampaign: "weekly",
        utmSource: "newsletter",
        utmMedium: "email",
        convertedAt: new Date(),
      });

      await attributeConversion("user-123", "SIGNUP");

      expect(prisma.campaignAttribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            platform: "OTHER",
          }),
        }),
      );
    });

    it("should detect OTHER from non-search referrer", async () => {
      const mockSessions = [
        {
          id: "session-1",
          visitorId: "v_visitor-123",
          userId: "user-123",
          sessionStart: new Date("2024-01-01"),
          sessionEnd: null,
          deviceType: null,
          browser: null,
          os: null,
          ipCountry: null,
          ipCity: null,
          referrer: "https://some-blog.com/article",
          landingPage: "/",
          exitPage: "/",
          pageViewCount: 1,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          utmTerm: null,
          utmContent: null,
          gclid: null,
          fbclid: null,
        },
      ];

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.campaignAttribution.create).mockResolvedValue({
        id: "attr-123",
        userId: "user-123",
        sessionId: "session-1",
        conversionId: "conv-123",
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: null,
        platform: "OTHER",
        externalCampaignId: null,
        utmCampaign: null,
        utmSource: null,
        utmMedium: null,
        convertedAt: new Date(),
      });

      await attributeConversion("user-123", "SIGNUP");

      expect(prisma.campaignAttribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            platform: "OTHER",
          }),
        }),
      );
    });
  });

  describe("getCampaignAttributionSummary", () => {
    it("should return correct summary for multiple conversions", async () => {
      const mockAttributions = [
        // Conversion 1: Signup (Value: 0)
        {
          id: "attr-1-ft",
          conversionId: "conv-1",
          attributionType: "FIRST_TOUCH",
          conversionType: "SIGNUP",
          conversionValue: 0,
          utmCampaign: "brand",
          convertedAt: new Date(),
        },
        {
          id: "attr-1-lt",
          conversionId: "conv-1",
          attributionType: "LAST_TOUCH",
          conversionType: "SIGNUP",
          conversionValue: 0,
          utmCampaign: "brand",
          convertedAt: new Date(),
        },
        {
          id: "attr-1-ln1",
          conversionId: "conv-1",
          attributionType: "LINEAR",
          conversionType: "SIGNUP",
          conversionValue: 0,
          utmCampaign: "brand",
          convertedAt: new Date(),
        },

        // Conversion 2: Purchase (Value: 50)
        {
          id: "attr-2-ft",
          conversionId: "conv-2",
          attributionType: "FIRST_TOUCH",
          conversionType: "PURCHASE",
          conversionValue: 50,
          utmCampaign: "brand",
          convertedAt: new Date(),
        },
        {
          id: "attr-2-lt",
          conversionId: "conv-2",
          attributionType: "LAST_TOUCH",
          conversionType: "PURCHASE",
          conversionValue: 50,
          utmCampaign: "brand",
          convertedAt: new Date(),
        },
        {
          id: "attr-2-ln1",
          conversionId: "conv-2",
          attributionType: "LINEAR",
          conversionType: "PURCHASE",
          conversionValue: 25,
          utmCampaign: "brand",
          convertedAt: new Date(),
        },
        {
          id: "attr-2-ln2",
          conversionId: "conv-2",
          attributionType: "LINEAR",
          conversionType: "PURCHASE",
          conversionValue: 25,
          utmCampaign: "brand",
          convertedAt: new Date(),
        },
      ] as any;

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue(
        mockAttributions,
      );

      const result = await getCampaignAttributionSummary(
        "brand",
        new Date(),
        new Date(),
      );

      expect(result).toEqual({
        totalConversions: 2,
        firstTouchValue: 50,
        lastTouchValue: 50,
        linearValue: 50,
        conversionsByType: {
          SIGNUP: 1,
          PURCHASE: 1,
          ENHANCEMENT: 0,
        },
      });
    });

    it("should return zero counts for empty results", async () => {
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);
      const result = await getCampaignAttributionSummary(
        "nonexistent",
        new Date(),
        new Date(),
      );
      expect(result).toEqual({
        totalConversions: 0,
        firstTouchValue: 0,
        lastTouchValue: 0,
        linearValue: 0,
        conversionsByType: {
          SIGNUP: 0,
          ENHANCEMENT: 0,
          PURCHASE: 0,
        },
      });
    });
  });

  describe("hasExistingAttribution", () => {
    it("should return true when attribution exists", async () => {
      vi.mocked(prisma.campaignAttribution.count).mockResolvedValue(2);

      const result = await hasExistingAttribution("user-123", "SIGNUP");

      expect(result).toBe(true);
      expect(prisma.campaignAttribution.count).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          conversionType: "SIGNUP",
        },
      });
    });

    it("should return false when no attribution exists", async () => {
      vi.mocked(prisma.campaignAttribution.count).mockResolvedValue(0);

      const result = await hasExistingAttribution("user-123", "PURCHASE");

      expect(result).toBe(false);
    });
  });

  describe("getExternalCampaignId", () => {
    it("should return the external campaign ID when a campaign link exists", async () => {
      const mockSessions = [
        {
          id: "session-1",
          visitorId: "v_visitor-123",
          userId: "user-123",
          sessionStart: new Date("2024-01-01"),
          sessionEnd: null,
          deviceType: null,
          browser: null,
          os: null,
          ipCountry: null,
          ipCity: null,
          referrer: "https://google.com",
          landingPage: "/",
          exitPage: "/about",
          pageViewCount: 3,
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "brand-campaign",
          utmTerm: null,
          utmContent: null,
          gclid: "abc123",
          fbclid: null,
        },
      ];

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.campaignLink.findUnique).mockResolvedValue({
        id: "link-1",
        utmCampaign: "brand-campaign",
        platform: "GOOGLE_ADS",
        externalCampaignId: "external-123",
        externalCampaignName: "Brand Campaign 2024",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await attributeConversion("user-123", "SIGNUP");

      const createCall = vi.mocked(prisma.campaignAttribution.create).mock.calls[0][0];
      expect(createCall.data.externalCampaignId).toBe("external-123");
    });

    it("should return null when no campaign link exists", async () => {
      const mockSessions = [
        {
          id: "session-1",
          visitorId: "v_visitor-123",
          userId: "user-123",
          sessionStart: new Date("2024-01-01"),
          sessionEnd: null,
          deviceType: null,
          browser: null,
          os: null,
          ipCountry: null,
          ipCity: null,
          referrer: "https://google.com",
          landingPage: "/",
          exitPage: "/about",
          pageViewCount: 3,
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "non-existent-campaign",
          utmTerm: null,
          utmContent: null,
          gclid: "abc123",
          fbclid: null,
        },
      ];

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.campaignLink.findUnique).mockResolvedValue(null);

      await attributeConversion("user-123", "SIGNUP");

      const createCall = vi.mocked(prisma.campaignAttribution.create).mock.calls[0][0];
      expect(createCall.data.externalCampaignId).toBe("abc123");
    });
  });
});
