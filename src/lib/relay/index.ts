/**
 * Relay Module Exports
 *
 * AI-powered response draft generation for social media inbox.
 * Resolves #555
 */

export {
  approveDraft,
  generateDrafts,
  getDraftsForInboxItem,
  regenerateDrafts,
  rejectDraft,
  saveDraftsToDatabase,
} from "./generate-drafts";

export type {
  ApproveDraftRequest,
  DraftMetadata,
  DraftResponse,
  GeminiDraftResponse,
  GeneratedDraft,
  GenerateDraftParams,
  GenerateDraftsRequest,
  GenerateDraftsResponse,
  InboxItemData,
  MessageAnalysis,
  MessageIntent,
  SaveDraftRequest,
  SendDraftRequest,
  ToneMatchScore,
} from "./relay-types";

export { getPlatformCharacterLimit, PLATFORM_CHARACTER_LIMITS } from "./relay-types";
