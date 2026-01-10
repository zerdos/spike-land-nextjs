/**
 * Relay Draft Generation Service
 *
 * AI-powered response draft generation using brand voice and context.
 * Resolves #555
 */

import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type { BrandGuardrail, BrandProfile, BrandVocabulary } from "@/types/brand-brain";
import type { SocialPlatform } from "@prisma/client";
import {
  geminiDraftResponseSchema,
  type GeminiDraftResponseValidated,
} from "../validations/relay-draft";
import type {
  DraftMetadata,
  GeminiDraftResponse,
  GeneratedDraft,
  GenerateDraftParams,
  GenerateDraftsResponse,
  InboxItemData,
} from "./relay-types";
import { getPlatformCharacterLimit } from "./relay-types";

// ============================================
// Constants
// ============================================

const DEFAULT_NUM_DRAFTS = 3;
const MAX_DRAFTS = 5;

// ============================================
// Prompt Building Functions
// ============================================

/**
 * Format guardrails for the system prompt.
 */
function formatGuardrails(guardrails: BrandGuardrail[]): string {
  if (!guardrails.length) return "No specific guardrails defined.";

  const severityEmoji: Record<string, string> = {
    LOW: "~",
    MEDIUM: "-",
    HIGH: "!",
    CRITICAL: "!!",
  };

  return guardrails
    .map((g) => {
      const emoji = severityEmoji[g.severity] || "-";
      return `${emoji} [${g.type}] ${g.name}: ${g.description || "No description"}`;
    })
    .join("\n");
}

/**
 * Format vocabulary rules for the system prompt.
 */
function formatVocabulary(vocabulary: BrandVocabulary[]): string {
  if (!vocabulary.length) return "No specific vocabulary rules defined.";

  const grouped = {
    PREFERRED: vocabulary.filter((v) => v.type === "PREFERRED"),
    BANNED: vocabulary.filter((v) => v.type === "BANNED"),
    REPLACEMENT: vocabulary.filter((v) => v.type === "REPLACEMENT"),
  };

  const parts: string[] = [];

  if (grouped.PREFERRED.length) {
    parts.push(
      "**Preferred Terms:** " +
        grouped.PREFERRED.map((v) => v.term).join(", "),
    );
  }
  if (grouped.BANNED.length) {
    parts.push(
      "**Banned Terms (MUST avoid):** " +
        grouped.BANNED.map((v) => v.context ? `${v.term} (${v.context})` : v.term).join(", "),
    );
  }
  if (grouped.REPLACEMENT.length) {
    parts.push(
      "**Required Replacements:** " +
        grouped.REPLACEMENT.map((v) => `"${v.term}" -> "${v.replacement}"`)
          .join(", "),
    );
  }

  return parts.join("\n") || "No specific vocabulary rules defined.";
}

/**
 * Get message type description for context.
 */
function getMessageTypeContext(inboxItem: InboxItemData): string {
  const typeDescriptions: Record<string, string> = {
    MENTION: "a brand mention that needs acknowledgment",
    COMMENT: "a comment on your content that deserves a response",
    DIRECT_MESSAGE: "a direct/private message requiring a personal response",
    REPLY: "a reply to your content that needs follow-up",
    REVIEW: "a review that requires a thoughtful, professional response",
  };

  return typeDescriptions[inboxItem.type] || "a social media interaction";
}

/**
 * Build the system prompt for draft generation.
 */
function buildDraftGenerationSystemPrompt(
  inboxItem: InboxItemData,
  brandProfile: BrandProfile | null,
  guardrails: BrandGuardrail[],
  vocabulary: BrandVocabulary[],
  numDrafts: number,
): string {
  const platform = inboxItem.platform;
  const characterLimit = getPlatformCharacterLimit(platform);
  const messageType = getMessageTypeContext(inboxItem);

  // Get tone descriptors with defaults
  const tone = brandProfile?.toneDescriptors ?? {
    formalCasual: 50,
    technicalSimple: 50,
    seriousPlayful: 50,
    reservedEnthusiastic: 50,
  };

  let prompt =
    `You are a social media response AI assistant. Your task is to generate ${numDrafts} draft responses to ${messageType} on ${platform}.

## Message Context
- **Platform**: ${platform}
- **Message Type**: ${inboxItem.type}
- **Sender**: ${inboxItem.senderName}${
      inboxItem.senderHandle ? ` (@${inboxItem.senderHandle})` : ""
    }
- **Character Limit**: ${characterLimit} characters

`;

  if (brandProfile) {
    prompt += `## Brand Profile: ${brandProfile.name}

### Mission
${brandProfile.mission || "Not specified"}

### Core Values
${brandProfile.values?.join(", ") || "Not specified"}

### Tone Guidelines
The brand voice should fall within these ranges (0-100 scale):
- Formal <-> Casual: Target ${tone.formalCasual ?? 50}
- Technical <-> Simple: Target ${tone.technicalSimple ?? 50}
- Serious <-> Playful: Target ${tone.seriousPlayful ?? 50}
- Reserved <-> Enthusiastic: Target ${tone.reservedEnthusiastic ?? 50}

### Guardrails
${formatGuardrails(guardrails)}

### Vocabulary Rules
${formatVocabulary(vocabulary)}

`;
  } else {
    prompt += `## No Brand Profile Available
Use a professional, friendly tone that is appropriate for ${platform}.

`;
  }

  prompt += `## Response Guidelines

1. **Be Authentic**: Sound human, not robotic. Match the brand voice.
2. **Be Helpful**: Address the sender's needs or concerns.
3. **Be Concise**: Stay within the ${characterLimit} character limit.
4. **Be Professional**: Even when addressing complaints, remain courteous.
5. **Be Relevant**: Include context from the original message.

## Draft Variety
Generate ${numDrafts} distinct drafts with different approaches:
- **Draft 1 (Primary)**: The most balanced, on-brand response
- **Draft 2**: A more concise/efficient version
${numDrafts >= 3 ? "- **Draft 3**: A warmer, more personal approach" : ""}
${numDrafts >= 4 ? "- **Draft 4**: A more formal/professional tone" : ""}
${numDrafts >= 5 ? "- **Draft 5**: A creative/unique approach" : ""}

## Response Format

You MUST respond with a valid JSON object containing:
{
  "drafts": [
    {
      "content": "<the draft response text>",
      "confidenceScore": <0.0-1.0 confidence in this draft>,
      "isPreferred": <true for the recommended draft, false otherwise>,
      "reason": "<why this draft approach was chosen>",
      "hashtags": ["<optional relevant hashtags>"],
      "mentions": ["<optional relevant mentions>"],
      "toneMatch": {
        "alignment": <overall brand voice alignment 0-100>,
        "formalCasual": <detected formal-casual score 0-100>,
        "technicalSimple": <detected technical-simple score 0-100>,
        "seriousPlayful": <detected serious-playful score 0-100>,
        "reservedEnthusiastic": <detected reserved-enthusiastic score 0-100>
      }
    }
  ],
  "messageAnalysis": {
    "sentiment": "<positive|negative|neutral|mixed>",
    "intent": "<question|feedback|complaint|praise|request|general|support|sales>",
    "topics": ["<key topics mentioned>"],
    "urgency": "<low|medium|high>",
    "hasQuestion": <true|false>,
    "hasComplaint": <true|false>,
    "needsEscalation": <true|false>
  }
}`;

  return prompt;
}

/**
 * Build the user prompt with message content.
 */
function buildUserPrompt(
  inboxItem: InboxItemData,
  customInstructions?: string,
): string {
  let prompt = `Generate response drafts for this ${inboxItem.platform} message:

---
**From**: ${inboxItem.senderName}${inboxItem.senderHandle ? ` (@${inboxItem.senderHandle})` : ""}
**Message**: ${inboxItem.content}
---`;

  if (inboxItem.originalPostContent) {
    prompt += `

**Context (Original Post)**: ${inboxItem.originalPostContent}`;
  }

  if (customInstructions) {
    prompt += `

**Additional Instructions**: ${customInstructions}`;
  }

  prompt += `

Generate the response drafts as JSON.`;

  return prompt;
}

// ============================================
// Draft Transformation
// ============================================

/**
 * Transform AI response to GeneratedDraft array.
 */
function transformDrafts(
  aiResponse: GeminiDraftResponseValidated,
  platform: SocialPlatform,
): GeneratedDraft[] {
  const platformLimit = getPlatformCharacterLimit(platform);

  return aiResponse.drafts.map((draft) => {
    const characterCount = draft.content.length;
    const withinCharacterLimit = characterCount <= platformLimit;

    const metadata: DraftMetadata = {
      hashtags: draft.hashtags,
      mentions: draft.mentions,
      toneMatch: {
        alignment: draft.toneMatch.alignment,
        formalCasual: draft.toneMatch.formalCasual,
        technicalSimple: draft.toneMatch.technicalSimple,
        seriousPlayful: draft.toneMatch.seriousPlayful,
        reservedEnthusiastic: draft.toneMatch.reservedEnthusiastic,
      },
      withinCharacterLimit,
      characterCount,
      platformLimit,
    };

    return {
      content: draft.content,
      confidenceScore: draft.confidenceScore,
      isPreferred: draft.isPreferred,
      reason: draft.reason,
      metadata,
    };
  });
}

// ============================================
// Main Generation Function
// ============================================

/**
 * Generate AI-powered response drafts for an inbox item.
 *
 * @param params - Generation parameters
 * @returns Generated drafts with analysis
 * @throws Error if generation fails
 */
export async function generateDrafts(
  params: GenerateDraftParams,
): Promise<GenerateDraftsResponse> {
  const {
    inboxItem,
    workspaceId,
    numDrafts = DEFAULT_NUM_DRAFTS,
    customInstructions,
  } = params;

  const effectiveNumDrafts = Math.min(Math.max(1, numDrafts), MAX_DRAFTS);

  // Fetch brand profile and related data
  const { data: brandData, error: brandError } = await tryCatch(
    prisma.brandProfile.findFirst({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        guardrails: {
          where: { isActive: true },
        },
        vocabulary: {
          where: { isActive: true },
        },
      },
    }),
  );

  if (brandError) {
    console.warn("[RELAY_DRAFTS] Failed to fetch brand profile:", brandError);
  }

  const brandProfile = brandData as BrandProfile | null;
  const guardrails = (brandData?.guardrails ?? []) as BrandGuardrail[];
  const vocabulary = (brandData?.vocabulary ?? []) as BrandVocabulary[];

  // Build prompts
  const systemPrompt = buildDraftGenerationSystemPrompt(
    inboxItem,
    brandProfile,
    guardrails,
    vocabulary,
    effectiveNumDrafts,
  );
  const userPrompt = buildUserPrompt(inboxItem, customInstructions);

  // Generate drafts using Gemini
  const { data: rawResponse, error: aiError } = await tryCatch(
    generateStructuredResponse<GeminiDraftResponse>({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 4096,
      temperature: 0.7, // Higher temperature for creative variety
    }),
  );

  if (aiError) {
    console.error("[RELAY_DRAFTS] Failed to generate drafts:", aiError);
    throw new Error(
      `Failed to generate drafts: ${aiError instanceof Error ? aiError.message : "Unknown error"}`,
    );
  }

  // Validate the response structure
  const parseResult = geminiDraftResponseSchema.safeParse(rawResponse);

  if (!parseResult.success) {
    console.error(
      "[RELAY_DRAFTS] Invalid response structure:",
      parseResult.error.issues,
    );
    throw new Error("Invalid draft response structure from AI");
  }

  const validatedResponse = parseResult.data;

  // Transform to our response format
  const drafts = transformDrafts(validatedResponse, inboxItem.platform);

  // Ensure exactly one draft is marked as preferred
  const hasPreferred = drafts.some((d) => d.isPreferred);
  if (!hasPreferred && drafts.length > 0) {
    // Mark the highest confidence draft as preferred
    const firstDraft = drafts[0];
    if (firstDraft) {
      const highestConfidence = drafts.reduce(
        (max, d) => (d.confidenceScore > max.confidenceScore ? d : max),
        firstDraft,
      );
      highestConfidence.isPreferred = true;
    }
  }

  return {
    drafts,
    inboxItemId: inboxItem.id,
    hasBrandProfile: !!brandProfile,
    messageAnalysis: validatedResponse.messageAnalysis,
    generatedAt: new Date(),
  };
}

/**
 * Regenerate drafts with feedback incorporation.
 *
 * @param params - Generation parameters with feedback
 * @returns Regenerated drafts
 */
export async function regenerateDrafts(
  params: GenerateDraftParams & { feedback?: string; },
): Promise<GenerateDraftsResponse> {
  const { feedback, customInstructions, ...baseParams } = params;

  // Incorporate feedback into custom instructions
  const combinedInstructions = feedback
    ? `${customInstructions ? `${customInstructions}\n\n` : ""}User Feedback: ${feedback}`
    : customInstructions;

  return generateDrafts({
    ...baseParams,
    customInstructions: combinedInstructions,
  });
}

// ============================================
// Database Operations
// ============================================

/**
 * Save generated drafts to the database.
 *
 * @param inboxItemId - ID of the inbox item
 * @param drafts - Generated drafts to save
 * @returns Saved draft records
 */
export async function saveDraftsToDatabase(
  inboxItemId: string,
  drafts: GeneratedDraft[],
) {
  const savedDrafts = await prisma.relayDraft.createMany({
    data: drafts.map((draft) => ({
      inboxItemId,
      content: draft.content,
      confidenceScore: draft.confidenceScore,
      isPreferred: draft.isPreferred,
      reason: draft.reason,
      metadata: draft.metadata ? JSON.parse(JSON.stringify(draft.metadata)) : undefined,
    })),
  });

  // Update inbox item status to pending reply
  await prisma.inboxItem.update({
    where: { id: inboxItemId },
    data: { status: "PENDING_REPLY" },
  });

  return savedDrafts;
}

/**
 * Get drafts for an inbox item.
 *
 * @param inboxItemId - ID of the inbox item
 * @returns Draft records
 */
export async function getDraftsForInboxItem(inboxItemId: string) {
  return prisma.relayDraft.findMany({
    where: { inboxItemId },
    orderBy: [{ isPreferred: "desc" }, { confidenceScore: "desc" }],
  });
}

/**
 * Approve a draft for sending.
 *
 * @param draftId - ID of the draft
 * @param reviewerId - ID of the user approving
 * @returns Updated draft record
 */
export async function approveDraft(draftId: string, reviewerId: string) {
  return prisma.relayDraft.update({
    where: { id: draftId },
    data: {
      status: "APPROVED",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });
}

/**
 * Reject a draft.
 *
 * @param draftId - ID of the draft
 * @param reviewerId - ID of the user rejecting
 * @returns Updated draft record
 */
export async function rejectDraft(draftId: string, reviewerId: string) {
  return prisma.relayDraft.update({
    where: { id: draftId },
    data: {
      status: "REJECTED",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });
}

// ============================================
// Exports for testing
// ============================================

export { buildDraftGenerationSystemPrompt as _buildDraftGenerationSystemPrompt };
export { buildUserPrompt as _buildUserPrompt };
export { formatGuardrails as _formatGuardrails };
export { formatVocabulary as _formatVocabulary };
export { transformDrafts as _transformDrafts };
