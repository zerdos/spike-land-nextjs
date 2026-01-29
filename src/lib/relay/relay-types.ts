/**
 * Relay Draft Types
 *
 * Type definitions for AI-powered response draft generation.
 * Resolves #555
 */

import type {
  InboxItemStatus,
  InboxItemType,
  RelayDraftStatus,
  SocialPlatform,
} from "@prisma/client";

// ============================================
// Inbox Item Types
// ============================================

export interface InboxItemData {
  id: string;
  type: InboxItemType;
  status: InboxItemStatus;
  platform: SocialPlatform;
  platformItemId: string;
  content: string;
  senderName: string;
  senderHandle: string | null;
  senderAvatarUrl: string | null;
  originalPostId: string | null;
  originalPostContent: string | null;
  metadata: Record<string, unknown> | null;
  receivedAt: Date;
  readAt: Date | null;
  repliedAt: Date | null;
  workspaceId: string;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Draft Generation Types
// ============================================

export interface GenerateDraftParams {
  /** The inbox item to generate drafts for */
  inboxItem: InboxItemData;
  /** Workspace ID for fetching brand profile */
  workspaceId: string;
  /** Number of draft options to generate (default: 3) */
  numDrafts?: number;
  /** Custom instructions for draft generation */
  customInstructions?: string;
}

export interface GeneratedDraft {
  /** The draft response content */
  content: string;
  /** Confidence score (0-1) for this draft */
  confidenceScore: number;
  /** Whether this is the recommended draft */
  isPreferred: boolean;
  /** Explanation of why this draft was generated */
  reason: string;
  /** Platform-specific metadata (hashtags, emoji usage, etc.) */
  metadata: DraftMetadata;
}

export interface DraftMetadata {
  /** Suggested hashtags for the response */
  hashtags?: string[];
  /** Suggested mentions */
  mentions?: string[];
  /** Tone descriptors that match brand voice */
  toneMatch: ToneMatchScore;
  /** Whether the draft respects character limits */
  withinCharacterLimit: boolean;
  /** Character count of the draft */
  characterCount: number;
  /** Maximum characters for the platform */
  platformLimit: number;
}

export interface ToneMatchScore {
  /** Overall alignment with brand voice (0-100) */
  alignment: number;
  /** Formal-casual score (0-100) */
  formalCasual: number;
  /** Technical-simple score (0-100) */
  technicalSimple: number;
  /** Serious-playful score (0-100) */
  seriousPlayful: number;
  /** Reserved-enthusiastic score (0-100) */
  reservedEnthusiastic: number;
}

export interface GenerateDraftsResponse {
  /** Generated draft options */
  drafts: GeneratedDraft[];
  /** ID of the inbox item */
  inboxItemId: string;
  /** Whether brand profile was available */
  hasBrandProfile: boolean;
  /** Analysis of the original message */
  messageAnalysis: MessageAnalysis;
  /** Generation timestamp */
  generatedAt: Date;
}

export interface MessageAnalysis {
  /** Detected sentiment of the incoming message */
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  /** Detected intent of the message */
  intent: MessageIntent;
  /** Key topics/entities mentioned */
  topics: string[];
  /** Urgency level of the message */
  urgency: "low" | "medium" | "high";
  /** Whether the message contains a question */
  hasQuestion: boolean;
  /** Whether the message contains a complaint */
  hasComplaint: boolean;
  /** Whether the message requires escalation */
  needsEscalation: boolean;
}

export type MessageIntent =
  | "question"
  | "feedback"
  | "complaint"
  | "praise"
  | "request"
  | "general"
  | "support"
  | "sales";

// ============================================
// API Request/Response Types
// ============================================

export interface GenerateDraftsRequest {
  /** ID of the inbox item */
  inboxItemId: string;
  /** Number of drafts to generate (1-5) */
  numDrafts?: number;
  /** Custom instructions */
  customInstructions?: string;
}

export interface SaveDraftRequest {
  /** ID of the inbox item */
  inboxItemId: string;
  /** Draft content */
  content: string;
  /** Confidence score */
  confidenceScore: number;
  /** Whether this is the preferred draft */
  isPreferred: boolean;
  /** Reason for the draft */
  reason: string;
  /** Metadata */
  metadata?: DraftMetadata;
}

export interface DraftResponse {
  id: string;
  content: string;
  confidenceScore: number;
  status: RelayDraftStatus;
  isPreferred: boolean;
  reason: string | null;
  metadata: DraftMetadata | null;
  inboxItemId: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  sentAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApproveDraftRequest {
  /** ID of the draft to approve */
  draftId: string;
}

export interface SendDraftRequest {
  /** ID of the draft to send */
  draftId: string;
}

// ============================================
// Platform-specific Limits
// ============================================

export const PLATFORM_CHARACTER_LIMITS: Record<SocialPlatform, number> = {
  TWITTER: 280,
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
  TIKTOK: 2200,
  YOUTUBE: 10000,
  DISCORD: 2000,
  SNAPCHAT: 250, // Snapchat story text limit
};

/**
 * Get character limit for a platform
 */
export function getPlatformCharacterLimit(platform: SocialPlatform): number {
  return PLATFORM_CHARACTER_LIMITS[platform] ?? 2200;
}

// ============================================
// AI Response Schema Types
// ============================================

export interface GeminiDraftResponse {
  drafts: Array<{
    content: string;
    confidenceScore: number;
    isPreferred: boolean;
    reason: string;
    hashtags?: string[];
    mentions?: string[];
    toneMatch: {
      alignment: number;
      formalCasual: number;
      technicalSimple: number;
      seriousPlayful: number;
      reservedEnthusiastic: number;
    };
  }>;
  messageAnalysis: {
    sentiment: "positive" | "negative" | "neutral" | "mixed";
    intent: MessageIntent;
    topics: string[];
    urgency: "low" | "medium" | "high";
    hasQuestion: boolean;
    hasComplaint: boolean;
    needsEscalation: boolean;
  };
}
