import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { generateCopyVariants } from "./generators/copy-generator";
import { suggestImagesForCopy } from "./generators/image-suggester";

export interface GenerationJobParams {
  userId: string;
  briefId?: string;
  seedContent?: string;
  count: number;
  tone?: string;
  targetLength?: "short" | "medium" | "long";
  includeImages?: boolean;
  targetAudience?: string;
  platform?: string;
}

/**
 * Creates the CreativeSet record for a generation job.
 */
export async function createGenerationJob(
  params: GenerationJobParams,
): Promise<{ id: string; name: string; contentToUse: string; audienceToUse: string; }> {
  const { briefId, seedContent, userId, count, tone, targetLength, targetAudience } = params;

  if (!briefId && !seedContent) {
    throw new Error("Either briefId or seedContent is required");
  }

  // Fetch brief name if available
  let setName = "Generated Variants";
  let contentToUse = seedContent || "";
  let audienceToUse = targetAudience || "";

  if (briefId) {
    const brief = await prisma.campaignBrief.findUnique({
      where: { id: briefId },
    });
    if (brief) {
      setName = `Variants for ${brief.name}`;
      // Use brief content if seedContent is empty
      if (!contentToUse) {
        contentToUse = brief.keyMessages.join("\n") || brief.toneOfVoice || "";
      }
      // Use brief audience if not provided (handling JSON field)
      if (!audienceToUse && brief.targetAudience) {
        audienceToUse = JSON.stringify(brief.targetAudience);
      }
    }
  }

  // Create the job record (CreativeSet)
  const set = await prisma.creativeSet.create({
    data: {
      name: setName,
      briefId: briefId || null, // Allow null if using seed content
      generatedById: userId,
      modelVersion: "gemini-2.0-flash",
      generationPrompt: `Generate ${count} variants with tone: ${tone || "auto"}`,
      status: "DRAFT",
      jobStatus: "PENDING",
      progress: 0,
      seedContent: contentToUse,
      variationConfig: {
        tone,
        length: targetLength,
        audience: audienceToUse,
      },
    },
  });

  return {
    id: set.id,
    name: setName,
    contentToUse,
    audienceToUse,
  };
}

/**
 * Processes the generation job.
 * Updates progress and creates variants.
 */
export async function processGenerationJob(
  setId: string,
  params: GenerationJobParams,
  seedContent: string,
  audience: string,
) {
  try {
    await prisma.creativeSet.update({
      where: { id: setId },
      data: { jobStatus: "PROCESSING", progress: 10 },
    });

    // 1. Generate Text Variants
    const copyVariants = await generateCopyVariants({
      seedContent,
      tone: params.tone,
      targetLength: params.targetLength,
      count: params.count,
      targetAudience: audience,
      platform: params.platform,
    });

    await prisma.creativeSet.update({
      where: { id: setId },
      data: { progress: 50 },
    });

    // 2. Create CreativeVariants and optionally generate image suggestions
    for (const [index, copy] of copyVariants.entries()) {
      // Create Text Variant
      const variant = await prisma.creativeVariant.create({
        data: {
          setId,
          variantNumber: index + 1,
          variantType: params.includeImages ? "COMBINED" : "TEXT_ONLY",
          status: "READY",
          // Copy fields
          headline: copy.headline,
          bodyText: copy.bodyText,
          callToAction: copy.callToAction,
          // Metadata
          tone: copy.tone,
          length: copy.length,
          aiModel: "gemini-2.0-flash",
          format: params.platform || "generic",
        },
      });

      // Generate Image Suggestions if requested
      if (params.includeImages) {
        try {
          const suggestions = await suggestImagesForCopy({
            copyText: `${copy.headline}\n${copy.bodyText}`,
            targetAudience: audience,
            count: 1, // One image per copy variant for now
          });

          if (suggestions.length > 0) {
            const suggestion = suggestions[0];
            if (suggestion) { // TS check for noUncheckedIndexedAccess
              await prisma.creativeVariant.update({
                where: { id: variant.id },
                data: {
                  aiPrompt: suggestion.imagePrompt,
                  // We could also store style/reasoning in a JSON field if we added one
                },
              });
            }
          }
        } catch (error) {
          logger.warn("Failed to suggest image for variant", { variantId: variant.id, error });
        }
      }
    }

    // Complete Job
    await prisma.creativeSet.update({
      where: { id: setId },
      data: {
        jobStatus: "COMPLETED",
        status: "ACTIVE", // Mark as active/ready for review
        progress: 100,
      },
    });
  } catch (error) {
    logger.error("Generation job failed", { setId, error });
    await prisma.creativeSet.update({
      where: { id: setId },
      data: {
        jobStatus: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

/**
 * Legacy wrapper for backward compatibility or simple usage.
 * Warning: Uses unawaited background promise. Use createGenerationJob + processGenerationJob with queue/after() instead.
 */
export async function startVariantGeneration(
  params: GenerationJobParams,
): Promise<string> {
  const { id, contentToUse, audienceToUse } = await createGenerationJob(params);

  void processGenerationJob(id, params, contentToUse, audienceToUse).catch((err) => {
    logger.error("Background generation failed", { error: err, setId: id });
  });

  return id;
}
