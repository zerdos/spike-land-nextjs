import { auth } from "@/auth";
import type {
  AnalysisConfig,
  AutoCropConfig,
  GenerationConfig,
  PromptConfig,
} from "@/lib/ai/pipeline-types";
import prisma from "@/lib/prisma";
import { PipelineVisibility } from "@prisma/client";
import { redirect } from "next/navigation";
import { PipelinesClient } from "./PipelinesClient";

export const metadata = {
  title: "Enhancement Pipelines | Pixel",
  description: "Manage your AI image enhancement pipeline configurations",
};

export default async function PipelinesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/apps/pixel/pipelines");
  }

  // Fetch pipelines server-side
  const pipelines = await prisma.enhancementPipeline.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { visibility: PipelineVisibility.PUBLIC },
        { userId: null },
      ],
    },
    orderBy: [
      { userId: "asc" },
      { usageCount: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      description: true,
      userId: true,
      visibility: true,
      tier: true,
      usageCount: true,
      createdAt: true,
      updatedAt: true,
      analysisConfig: true,
      autoCropConfig: true,
      promptConfig: true,
      generationConfig: true,
    },
  });

  const pipelinesWithFlags = pipelines.map((p) => ({
    ...p,
    isOwner: p.userId === session.user.id,
    isSystemDefault: p.userId === null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    // Cast JSON fields to proper types
    analysisConfig: p.analysisConfig as AnalysisConfig | null,
    autoCropConfig: p.autoCropConfig as AutoCropConfig | null,
    promptConfig: p.promptConfig as PromptConfig | null,
    generationConfig: p.generationConfig as GenerationConfig | null,
  }));

  return <PipelinesClient initialPipelines={pipelinesWithFlags} />;
}
