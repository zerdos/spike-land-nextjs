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
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: null,
        platform: "GOOGLE_ADS",
        externalCampaignId: null,
        utmCampaign: undefined,
        utmSource: undefined,
        utmMedium: undefined,
        convertedAt: new Date(),
      });

      await createAttribution({
        userId: "user-123",
        sessionId: "session-123",
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
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: null,
        platform: "GOOGLE_ADS",
        externalCampaignId: null,
        utmCampaign: "brand",
        utmSource: "google",
        utmMedium: "cpc",
        convertedAt: new Date("2024-01-01"),
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
        attributionType: "LAST_TOUCH",
        conversionType: "PURCHASE",
        conversionValue: 9.99,
        platform: "FACEBOOK",
        externalCampaignId: null,
        utmCampaign: "retargeting",
        utmSource: "facebook",
        utmMedium: "paid",
        convertedAt: new Date("2024-01-15"),
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
          attributionType: "FIRST_TOUCH",
          conversionType: "SIGNUP",
          conversionValue: null,
          platform: "GOOGLE_ADS",
          externalCampaignId: null,
          utmCampaign: "brand",
          utmSource: "google",
          utmMedium: "cpc",
          convertedAt: new Date("2024-01-01"),
        },
        {
          id: "attr-2",
          userId: "user-123",
          sessionId: "session-2",
          attributionType: "LAST_TOUCH",
          conversionType: "PURCHASE",
          conversionValue: 9.99,
          platform: "DIRECT",
          externalCampaignId: null,
          utmCampaign: null,
          utmSource: null,
          utmMedium: null,
          convertedAt: new Date("2024-01-15"),
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
    it("should create both first-touch and last-touch attributions", async () => {
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
        attributionType: "FIRST_TOUCH",
        conversionType: "SIGNUP",
        conversionValue: null,
        platform: "GOOGLE_ADS",
        externalCampaignId: "abc123",
        utmCampaign: "brand",
        utmSource: "google",
        utmMedium: "cpc",
        convertedAt: new Date(),
      });

      await attributeConversion("user-123", "SIGNUP");

      expect(prisma.campaignAttribution.create).toHaveBeenCalledTimes(2);
      // First call should be FIRST_TOUCH with first session
      expect(prisma.campaignAttribution.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: "session-1",
            attributionType: "FIRST_TOUCH",
            platform: "GOOGLE_ADS",
          }),
        }),
      );
      // Second call should be LAST_TOUCH with last session
      expect(prisma.campaignAttribution.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: "session-2",
            attributionType: "LAST_TOUCH",
            platform: "DIRECT",
          }),
        }),
      );
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

      expect(prisma.campaignAttribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversionValue: 9.99,
          }),
        }),
      );
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
        tokenBalance: 100,
        referralCode: null,
        referredById: null,
        stripeCustomerId: null,
        aiProvider: "gemini",
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
          expect.objectContaining({
            attributionType: "FIRST_TOUCH",
            platform: "DIRECT",
          }),
          expect.objectContaining({
            attributionType: "LAST_TOUCH",
            platform: "DIRECT",
          }),
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

      expect(prisma.campaignAttribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            platform: "FACEBOOK",
            externalCampaignId: "fb-click-id",
          }),
        }),
      );
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
    it("should return attribution summary for campaign", async () => {
      const mockAttributions = [
        {
          id: "attr-1",
          userId: "user-1",
          sessionId: "session-1",
          attributionType: "FIRST_TOUCH",
          conversionType: "SIGNUP",
          conversionValue: null,
          platform: "GOOGLE_ADS",
          externalCampaignId: null,
          utmCampaign: "brand",
          utmSource: "google",
          utmMedium: "cpc",
          convertedAt: new Date("2024-01-05"),
        },
        {
          id: "attr-2",
          userId: "user-2",
          sessionId: "session-2",
          attributionType: "LAST_TOUCH",
          conversionType: "PURCHASE",
          conversionValue: 9.99,
          platform: "GOOGLE_ADS",
          externalCampaignId: null,
          utmCampaign: "brand",
          utmSource: "google",
          utmMedium: "cpc",
          convertedAt: new Date("2024-01-10"),
        },
        {
          id: "attr-3",
          userId: "user-3",
          sessionId: "session-3",
          attributionType: "FIRST_TOUCH",
          conversionType: "ENHANCEMENT",
          conversionValue: 100,
          platform: "GOOGLE_ADS",
          externalCampaignId: null,
          utmCampaign: "brand",
          utmSource: "google",
          utmMedium: "cpc",
          convertedAt: new Date("2024-01-15"),
        },
      ];

      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue(
        mockAttributions,
      );

      const result = await getCampaignAttributionSummary(
        "brand",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      expect(result).toEqual({
        totalConversions: 3,
        firstTouchCount: 2,
        lastTouchCount: 1,
        totalValue: 109.99,
        conversionsByType: {
          SIGNUP: 1,
          ENHANCEMENT: 1,
          PURCHASE: 1,
        },
      });
    });

    it("should return zero counts for empty results", async () => {
      vi.mocked(prisma.campaignAttribution.findMany).mockResolvedValue([]);

      const result = await getCampaignAttributionSummary(
        "nonexistent",
        new Date("2024-01-01"),
        new Date("2024-01-31"),
      );

      expect(result).toEqual({
        totalConversions: 0,
        firstTouchCount: 0,
        lastTouchCount: 0,
        totalValue: 0,
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
});
