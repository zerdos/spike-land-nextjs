import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import type {
  BrandProfileFormData,
  ColorPaletteItem,
  Guardrail,
  ToneDescriptors,
  VocabularyItem,
} from "@/lib/validations/brand-brain";
import { redirect } from "next/navigation";
import { BrandBrainWizard } from "./components/BrandBrainWizard";

interface Props {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function BrandBrainSetupPage({ params }: Props) {
  const session = await auth();
  const { workspaceSlug } = await params;

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get workspace by slug
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true, slug: true },
    }),
  );

  if (workspaceError || !workspace) {
    redirect("/orbit");
  }

  // Check if user has permission (brand:write requires ADMIN role)
  const { data: membership } = await tryCatch(
    prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: session.user.id,
        },
      },
      select: { role: true },
    }),
  );

  if (
    !membership || (membership.role !== "ADMIN" && membership.role !== "OWNER")
  ) {
    redirect(`/orbit/${workspaceSlug}/brand-brain`);
  }

  // Fetch existing brand profile if any
  const { data: existingProfile } = await tryCatch(
    prisma.brandProfile.findUnique({
      where: { workspaceId: workspace.id },
      include: {
        guardrails: { where: { isActive: true } },
        vocabulary: { where: { isActive: true } },
      },
    }),
  );

  // Convert database model to form data
  let formData: BrandProfileFormData | null = null;
  if (existingProfile) {
    formData = {
      name: existingProfile.name,
      mission: existingProfile.mission || "",
      values: (existingProfile.values as string[]) || [],
      toneDescriptors: (existingProfile.toneDescriptors as ToneDescriptors) || {
        formalCasual: 50,
        technicalSimple: 50,
        seriousPlayful: 50,
        reservedEnthusiastic: 50,
      },
      logoUrl: existingProfile.logoUrl || "",
      logoR2Key: existingProfile.logoR2Key || "",
      colorPalette: (existingProfile.colorPalette as ColorPaletteItem[]) || [],
      guardrails: existingProfile.guardrails.map((g): Guardrail => ({
        id: g.id,
        type: g.type,
        name: g.name,
        description: g.description || undefined,
        severity: g.severity,
        ruleConfig: (g.ruleConfig as Record<string, unknown>) || undefined,
        isActive: g.isActive,
      })),
      vocabulary: existingProfile.vocabulary.map((v): VocabularyItem => ({
        id: v.id,
        type: v.type,
        term: v.term,
        replacement: v.replacement || undefined,
        context: v.context || undefined,
        isActive: v.isActive,
      })),
    };
  }

  // Server-side permission check already done above - unauthorized users are redirected
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <BrandBrainWizard
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
        existingProfile={formData}
      />
    </div>
  );
}
