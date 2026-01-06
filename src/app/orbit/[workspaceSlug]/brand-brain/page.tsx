import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { cn } from "@/lib/utils";
import type { ColorPaletteItem, ToneDescriptors } from "@/lib/validations/brand-brain";
import { VOICE_DIMENSION_LABELS } from "@/lib/validations/brand-brain";
import { Brain, Edit2, Palette, Plus, Shield, Sparkles, Volume2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentRewriterCard } from "./rewriter/components/ContentRewriterCard";

interface Props {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function BrandBrainPage({ params }: Props) {
  const session = await auth();
  const { workspaceSlug } = await params;

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get workspace by slug
  const { data: workspace, error: workspaceError } = await tryCatch(
    prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true, slug: true, name: true },
    }),
  );

  if (workspaceError || !workspace) {
    redirect("/orbit");
  }

  // Fetch brand profile
  const { data: brandProfile } = await tryCatch(
    prisma.brandProfile.findUnique({
      where: { workspaceId: workspace.id },
      include: {
        guardrails: { where: { isActive: true } },
        vocabulary: { where: { isActive: true } },
      },
    }),
  );

  // Check user role for edit permissions
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

  const canEdit = membership?.role === "ADMIN" || membership?.role === "OWNER";

  // If no brand profile exists, show setup prompt
  if (!brandProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Brand Brain</h1>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Brain className="h-12 w-12 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Set Up Your Brand Brain</h2>
            <p className="mb-6 max-w-md text-center text-muted-foreground">
              Configure your brand identity, voice, visual assets, and content guardrails to ensure
              AI-generated content stays on-brand.
            </p>
            {canEdit
              ? (
                <Button asChild size="lg">
                  <Link href={`/orbit/${workspaceSlug}/brand-brain/setup`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Start Setup
                  </Link>
                </Button>
              )
              : (
                <p className="text-sm text-muted-foreground">
                  Contact a workspace admin to set up Brand Brain.
                </p>
              )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const toneDescriptors = brandProfile.toneDescriptors as ToneDescriptors | null;
  const colorPalette = brandProfile.colorPalette as ColorPaletteItem[] | null;
  const values = brandProfile.values as string[] | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Brain</h1>
          <p className="text-muted-foreground">
            Your AI content guardian for {workspace.name}
          </p>
        </div>
        {canEdit && (
          <Button asChild variant="outline">
            <Link href={`/orbit/${workspaceSlug}/brand-brain/setup`}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        )}
      </div>

      {/* Brand Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Brand Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Brand Identity
            </CardTitle>
            <CardDescription>Core brand information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo */}
            {brandProfile.logoUrl && (
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={brandProfile.logoUrl}
                    alt={`${brandProfile.name} logo`}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-semibold">{brandProfile.name}</p>
                  <p className="text-xs text-muted-foreground">Brand Logo</p>
                </div>
              </div>
            )}

            {!brandProfile.logoUrl && (
              <div>
                <p className="font-semibold">{brandProfile.name}</p>
              </div>
            )}

            {/* Mission */}
            {brandProfile.mission && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Mission</p>
                <p className="text-sm">{brandProfile.mission}</p>
              </div>
            )}

            {/* Values */}
            {values && values.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Values</p>
                <div className="flex flex-wrap gap-1">
                  {values.map((value, i) => (
                    <Badge key={i} variant="secondary">
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice & Tone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Voice & Tone
            </CardTitle>
            <CardDescription>How your brand communicates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {toneDescriptors
              ? (
                Object.entries(VOICE_DIMENSION_LABELS).map(([key, labels]) => {
                  const value = toneDescriptors[key as keyof ToneDescriptors] ?? 50;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-20 text-right text-xs",
                          value < 50 ? "font-medium" : "text-muted-foreground",
                        )}
                      >
                        {labels.left}
                      </span>
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={cn(
                          "w-20 text-xs",
                          value > 50 ? "font-medium" : "text-muted-foreground",
                        )}
                      >
                        {labels.right}
                      </span>
                    </div>
                  );
                })
              )
              : (
                <p className="text-sm text-muted-foreground">
                  Voice settings not configured
                </p>
              )}
          </CardContent>
        </Card>

        {/* Visual Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Color Palette
            </CardTitle>
            <CardDescription>Brand colors</CardDescription>
          </CardHeader>
          <CardContent>
            {colorPalette && colorPalette.length > 0
              ? (
                <div className="flex flex-wrap gap-3">
                  {colorPalette.map((color, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="h-10 w-10 rounded-lg border shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-xs font-medium">{color.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {color.hex}
                      </span>
                    </div>
                  ))}
                </div>
              )
              : (
                <p className="text-sm text-muted-foreground">
                  No colors defined
                </p>
              )}
          </CardContent>
        </Card>

        {/* Guardrails */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Content Guardrails
            </CardTitle>
            <CardDescription>Rules and vocabulary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Guardrails Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {brandProfile.guardrails.filter((g) => g.type === "PROHIBITED_TOPIC").length}
                </p>
                <p className="text-xs text-muted-foreground">Prohibited</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {brandProfile.guardrails.filter((g) => g.type === "REQUIRED_DISCLOSURE").length}
                </p>
                <p className="text-xs text-muted-foreground">Disclosures</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {brandProfile.guardrails.filter((g) => g.type === "CONTENT_WARNING").length}
                </p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>

            {/* Vocabulary Summary */}
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Vocabulary</p>
              <p className="text-sm">
                {brandProfile.vocabulary.length} term
                {brandProfile.vocabulary.length !== 1 ? "s" : ""} configured
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tools */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Content Tools</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ContentRewriterCard workspaceSlug={workspaceSlug} />
        </div>
      </div>

      {/* Version Info */}
      <p className="text-xs text-muted-foreground">
        Profile version {brandProfile.version} &bull; Last updated{" "}
        {new Date(brandProfile.updatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
