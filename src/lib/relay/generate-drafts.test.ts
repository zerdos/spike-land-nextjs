/**
 * Relay Draft Generation Service Tests
 *
 * Unit tests for the AI-powered response draft generation.
 * Resolves #555
 */

import type { BrandGuardrail, BrandProfile, BrandVocabulary } from "@/types/brand-brain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock generateStructuredResponse
vi.mock("@/lib/ai/gemini-client", () => ({
  generateStructuredResponse: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    brandProfile: {
      findFirst: vi.fn(),
    },
    relayDraft: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    inboxItem: {
      update: vi.fn(),
    },
  },
}));

// Import after mocks
import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import {
  _buildDraftGenerationSystemPrompt,
  _buildUserPrompt,
  _formatGuardrails,
  _formatVocabulary,
  _transformDrafts,
  approveDraft,
  generateDrafts,
  getDraftsForInboxItem,
  rejectDraft,
  saveDraftsToDatabase,
} from "./generate-drafts";
import type { GeminiDraftResponse, InboxItemData } from "./relay-types";

const mockGenerateStructuredResponse = generateStructuredResponse as ReturnType<
  typeof vi.fn
>;

describe("generate-drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Sample test data
  const mockBrandProfile: BrandProfile = {
    id: "profile-123",
    workspaceId: "workspace-123",
    name: "Test Brand",
    mission: "To help people succeed",
    values: ["Helpfulness", "Clarity", "Trust"],
    toneDescriptors: {
      formalCasual: 40,
      technicalSimple: 60,
      seriousPlayful: 50,
      reservedEnthusiastic: 70,
    },
    version: 1,
    isActive: true,
    createdById: "user-123",
    updatedById: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGuardrails: BrandGuardrail[] = [
    {
      id: "g1",
      brandProfileId: "profile-123",
      type: "PROHIBITED_TOPIC",
      name: "Competition",
      description: "Never mention competitors negatively",
      severity: "HIGH",
      ruleConfig: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockVocabulary: BrandVocabulary[] = [
    {
      id: "v1",
      brandProfileId: "profile-123",
      term: "amazing",
      type: "PREFERRED",
      replacement: null,
      context: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "v2",
      brandProfileId: "profile-123",
      term: "problem",
      type: "REPLACEMENT",
      replacement: "challenge",
      context: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockInboxItem: InboxItemData = {
    id: "inbox-123",
    type: "COMMENT",
    status: "UNREAD",
    platform: "TWITTER",
    platformItemId: "tweet-456",
    content: "Hey, I love your product! Can you tell me more about the pricing?",
    senderName: "John Doe",
    senderHandle: "johndoe",
    senderAvatarUrl: "https://example.com/avatar.jpg",
    originalPostId: "post-789",
    originalPostContent: "Check out our new feature!",
    metadata: null,
    receivedAt: new Date(),
    readAt: null,
    repliedAt: null,
    workspaceId: "workspace-123",
    accountId: "account-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAIResponse: GeminiDraftResponse = {
    drafts: [
      {
        content:
          "Thanks John! We'd love to help with pricing. Check out our pricing page at example.com/pricing or DM us for custom quotes!",
        confidenceScore: 0.92,
        isPreferred: true,
        reason: "Balanced response with call-to-action",
        hashtags: [],
        toneMatch: {
          alignment: 85,
          formalCasual: 45,
          technicalSimple: 65,
          seriousPlayful: 50,
          reservedEnthusiastic: 75,
        },
      },
      {
        content: "Hey John! Pricing info: example.com/pricing",
        confidenceScore: 0.78,
        isPreferred: false,
        reason: "Concise version",
        toneMatch: {
          alignment: 70,
          formalCasual: 60,
          technicalSimple: 80,
          seriousPlayful: 55,
          reservedEnthusiastic: 65,
        },
      },
      {
        content:
          "John, thank you so much for your kind words! We appreciate you! For pricing details, visit example.com/pricing - we've got plans for everyone!",
        confidenceScore: 0.85,
        isPreferred: false,
        reason: "Warmer, more personal approach",
        toneMatch: {
          alignment: 80,
          formalCasual: 55,
          technicalSimple: 50,
          seriousPlayful: 60,
          reservedEnthusiastic: 85,
        },
      },
    ],
    messageAnalysis: {
      sentiment: "positive",
      intent: "question",
      topics: ["pricing", "product"],
      urgency: "medium",
      hasQuestion: true,
      hasComplaint: false,
      needsEscalation: false,
    },
  };

  // ============================================
  // formatGuardrails Tests
  // ============================================

  describe("formatGuardrails", () => {
    it("formats guardrails with severity emojis", () => {
      const result = _formatGuardrails(mockGuardrails);
      expect(result).toContain("!");
      expect(result).toContain("Competition");
      expect(result).toContain("Never mention competitors negatively");
    });

    it("returns default message for empty guardrails", () => {
      const result = _formatGuardrails([]);
      expect(result).toBe("No specific guardrails defined.");
    });
  });

  // ============================================
  // formatVocabulary Tests
  // ============================================

  describe("formatVocabulary", () => {
    it("formats vocabulary by type", () => {
      const result = _formatVocabulary(mockVocabulary);
      expect(result).toContain("Preferred Terms:");
      expect(result).toContain("amazing");
      expect(result).toContain("Required Replacements:");
      expect(result).toContain('"problem" -> "challenge"');
    });

    it("returns default message for empty vocabulary", () => {
      const result = _formatVocabulary([]);
      expect(result).toBe("No specific vocabulary rules defined.");
    });
  });

  // ============================================
  // buildDraftGenerationSystemPrompt Tests
  // ============================================

  describe("buildDraftGenerationSystemPrompt", () => {
    it("builds prompt with brand profile", () => {
      const result = _buildDraftGenerationSystemPrompt(
        mockInboxItem,
        mockBrandProfile,
        mockGuardrails,
        mockVocabulary,
        3,
      );

      expect(result).toContain("Test Brand");
      expect(result).toContain("TWITTER");
      expect(result).toContain("COMMENT");
      expect(result).toContain("280 characters");
      expect(result).toContain("To help people succeed");
    });

    it("builds prompt without brand profile", () => {
      const result = _buildDraftGenerationSystemPrompt(
        mockInboxItem,
        null,
        [],
        [],
        3,
      );

      expect(result).toContain("No Brand Profile Available");
      expect(result).toContain("professional, friendly tone");
    });

    it("includes draft variety instructions based on numDrafts", () => {
      const result3 = _buildDraftGenerationSystemPrompt(
        mockInboxItem,
        mockBrandProfile,
        [],
        [],
        3,
      );
      expect(result3).toContain("Draft 3");
      expect(result3).not.toContain("Draft 4");

      const result5 = _buildDraftGenerationSystemPrompt(
        mockInboxItem,
        mockBrandProfile,
        [],
        [],
        5,
      );
      expect(result5).toContain("Draft 5");
    });
  });

  // ============================================
  // buildUserPrompt Tests
  // ============================================

  describe("buildUserPrompt", () => {
    it("builds user prompt with message content", () => {
      const result = _buildUserPrompt(mockInboxItem);

      expect(result).toContain("John Doe");
      expect(result).toContain("@johndoe");
      expect(result).toContain("love your product");
      expect(result).toContain("Check out our new feature");
    });

    it("includes custom instructions when provided", () => {
      const result = _buildUserPrompt(mockInboxItem, "Be extra friendly");

      expect(result).toContain("Additional Instructions");
      expect(result).toContain("Be extra friendly");
    });
  });

  // ============================================
  // transformDrafts Tests
  // ============================================

  describe("transformDrafts", () => {
    it("transforms AI response to GeneratedDraft array", () => {
      const result = _transformDrafts(mockAIResponse, "TWITTER");
      const firstDraft = result[0]!;
      const mockFirstDraft = mockAIResponse.drafts[0]!;

      expect(result).toHaveLength(3);
      expect(firstDraft.content).toBe(mockFirstDraft.content);
      expect(firstDraft.confidenceScore).toBe(0.92);
      expect(firstDraft.isPreferred).toBe(true);
      expect(firstDraft.metadata.platformLimit).toBe(280);
    });

    it("sets withinCharacterLimit correctly", () => {
      const result = _transformDrafts(mockAIResponse, "TWITTER");
      const firstDraft = result[0]!;

      // First draft is 118 chars, within 280 limit
      expect(firstDraft.metadata.withinCharacterLimit).toBe(true);
    });

    it("handles different platforms with different limits", () => {
      const resultLinkedIn = _transformDrafts(mockAIResponse, "LINKEDIN");
      expect(resultLinkedIn[0]!.metadata.platformLimit).toBe(3000);

      const resultFacebook = _transformDrafts(mockAIResponse, "FACEBOOK");
      expect(resultFacebook[0]!.metadata.platformLimit).toBe(63206);
    });
  });

  // ============================================
  // generateDrafts Tests
  // ============================================

  describe("generateDrafts", () => {
    it("generates drafts successfully with brand profile", async () => {
      vi.mocked(prisma.brandProfile.findFirst).mockResolvedValue({
        ...mockBrandProfile,
        guardrails: mockGuardrails,
        vocabulary: mockVocabulary,
      } as never);

      mockGenerateStructuredResponse.mockResolvedValue(mockAIResponse);

      const result = await generateDrafts({
        inboxItem: mockInboxItem,
        workspaceId: "workspace-123",
        numDrafts: 3,
      });

      expect(result.drafts).toHaveLength(3);
      expect(result.inboxItemId).toBe("inbox-123");
      expect(result.hasBrandProfile).toBe(true);
      expect(result.messageAnalysis.sentiment).toBe("positive");
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it("generates drafts without brand profile", async () => {
      vi.mocked(prisma.brandProfile.findFirst).mockResolvedValue(null);
      mockGenerateStructuredResponse.mockResolvedValue(mockAIResponse);

      const result = await generateDrafts({
        inboxItem: mockInboxItem,
        workspaceId: "workspace-123",
      });

      expect(result.hasBrandProfile).toBe(false);
      expect(result.drafts).toHaveLength(3);
    });

    it("ensures one draft is marked as preferred", async () => {
      const responseWithoutPreferred = {
        ...mockAIResponse,
        drafts: mockAIResponse.drafts.map((d) => ({
          ...d,
          isPreferred: false,
        })),
      };

      vi.mocked(prisma.brandProfile.findFirst).mockResolvedValue(null);
      mockGenerateStructuredResponse.mockResolvedValue(
        responseWithoutPreferred,
      );

      const result = await generateDrafts({
        inboxItem: mockInboxItem,
        workspaceId: "workspace-123",
      });

      const preferredCount = result.drafts.filter((d) => d.isPreferred).length;
      expect(preferredCount).toBe(1);
    });

    it("limits numDrafts to max 5", async () => {
      vi.mocked(prisma.brandProfile.findFirst).mockResolvedValue(null);
      mockGenerateStructuredResponse.mockResolvedValue(mockAIResponse);

      await generateDrafts({
        inboxItem: mockInboxItem,
        workspaceId: "workspace-123",
        numDrafts: 10, // Over limit
      });

      // Verify the system prompt mentions 5 drafts, not 10
      const call = mockGenerateStructuredResponse.mock.calls[0]![0]!;
      expect(call.systemPrompt).toContain("generate 5 draft responses");
    });

    it("throws error on AI failure", async () => {
      vi.mocked(prisma.brandProfile.findFirst).mockResolvedValue(null);
      mockGenerateStructuredResponse.mockRejectedValue(new Error("API Error"));

      await expect(
        generateDrafts({
          inboxItem: mockInboxItem,
          workspaceId: "workspace-123",
        }),
      ).rejects.toThrow("Failed to generate drafts");
    });

    it("throws error on invalid AI response", async () => {
      vi.mocked(prisma.brandProfile.findFirst).mockResolvedValue(null);
      mockGenerateStructuredResponse.mockResolvedValue({
        drafts: [], // Invalid - empty array
        messageAnalysis: {},
      });

      await expect(
        generateDrafts({
          inboxItem: mockInboxItem,
          workspaceId: "workspace-123",
        }),
      ).rejects.toThrow("Invalid draft response structure");
    });
  });

  // ============================================
  // saveDraftsToDatabase Tests
  // ============================================

  describe("saveDraftsToDatabase", () => {
    it("saves drafts and updates inbox status", async () => {
      vi.mocked(prisma.relayDraft.createMany).mockResolvedValue({ count: 3 });
      vi.mocked(prisma.inboxItem.update).mockResolvedValue({} as never);

      const drafts = _transformDrafts(mockAIResponse, "TWITTER");
      await saveDraftsToDatabase("inbox-123", drafts);

      expect(prisma.relayDraft.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            inboxItemId: "inbox-123",
            confidenceScore: 0.92,
            isPreferred: true,
          }),
        ]),
      });

      expect(prisma.inboxItem.update).toHaveBeenCalledWith({
        where: { id: "inbox-123" },
        data: { status: "PENDING_REPLY" },
      });
    });
  });

  // ============================================
  // getDraftsForInboxItem Tests
  // ============================================

  describe("getDraftsForInboxItem", () => {
    it("fetches drafts ordered by preference and confidence", async () => {
      const mockDrafts = [
        { id: "draft-1", isPreferred: true, confidenceScore: 0.9 },
        { id: "draft-2", isPreferred: false, confidenceScore: 0.8 },
      ];
      vi.mocked(prisma.relayDraft.findMany).mockResolvedValue(
        mockDrafts as never,
      );

      const result = await getDraftsForInboxItem("inbox-123");

      expect(prisma.relayDraft.findMany).toHaveBeenCalledWith({
        where: { inboxItemId: "inbox-123" },
        orderBy: [{ isPreferred: "desc" }, { confidenceScore: "desc" }],
      });
      expect(result).toEqual(mockDrafts);
    });
  });

  // ============================================
  // approveDraft Tests
  // ============================================

  describe("approveDraft", () => {
    it("updates draft status to APPROVED", async () => {
      const mockUpdated = {
        id: "draft-123",
        status: "APPROVED",
        reviewedById: "user-123",
        reviewedAt: new Date(),
      };
      vi.mocked(prisma.relayDraft.update).mockResolvedValue(
        mockUpdated as never,
      );

      const result = await approveDraft("draft-123", "user-123");

      expect(prisma.relayDraft.update).toHaveBeenCalledWith({
        where: { id: "draft-123" },
        data: {
          status: "APPROVED",
          reviewedById: "user-123",
          reviewedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe("APPROVED");
    });
  });

  // ============================================
  // rejectDraft Tests
  // ============================================

  describe("rejectDraft", () => {
    it("updates draft status to REJECTED", async () => {
      const mockUpdated = {
        id: "draft-123",
        status: "REJECTED",
        reviewedById: "user-123",
        reviewedAt: new Date(),
      };
      vi.mocked(prisma.relayDraft.update).mockResolvedValue(
        mockUpdated as never,
      );

      const result = await rejectDraft("draft-123", "user-123");

      expect(prisma.relayDraft.update).toHaveBeenCalledWith({
        where: { id: "draft-123" },
        data: {
          status: "REJECTED",
          reviewedById: "user-123",
          reviewedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe("REJECTED");
    });
  });

  // ============================================
  // Message Type Context Tests
  // ============================================

  describe("message type context", () => {
    it("handles different inbox item types", async () => {
      vi.mocked(prisma.brandProfile.findFirst).mockResolvedValue(null);
      mockGenerateStructuredResponse.mockResolvedValue(mockAIResponse);

      const mentionItem: InboxItemData = { ...mockInboxItem, type: "MENTION" };
      await generateDrafts({
        inboxItem: mentionItem,
        workspaceId: "workspace-123",
      });

      const call = mockGenerateStructuredResponse.mock.calls[0]![0]!;
      expect(call.systemPrompt).toContain("brand mention");

      vi.clearAllMocks();

      const dmItem: InboxItemData = {
        ...mockInboxItem,
        type: "DIRECT_MESSAGE",
      };
      await generateDrafts({
        inboxItem: dmItem,
        workspaceId: "workspace-123",
      });

      const call2 = mockGenerateStructuredResponse.mock.calls[0]![0]!;
      expect(call2.systemPrompt).toContain("direct/private message");
    });
  });
});
