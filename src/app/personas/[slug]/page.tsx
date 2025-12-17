/**
 * Individual Persona Page
 *
 * Deep-linkable page for each customer persona with full details.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { getPersonaBySlug, PERSONAS } from "@/lib/marketing/personas";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string; }>;
}

export async function generateStaticParams() {
  return PERSONAS.map((persona) => ({
    slug: persona.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const persona = getPersonaBySlug(slug);

  if (!persona) {
    return {
      title: "Persona Not Found | Spike Land",
    };
  }

  return {
    title: `${persona.name} | Customer Personas | Spike Land`,
    description:
      `${persona.primaryHook} - Marketing persona for Pixel AI Photo Enhancement targeting ${persona.demographics.age} on ${persona.demographics.platform}`,
    openGraph: {
      title: `${persona.name} - ${persona.primaryHook}`,
      description:
        `Marketing persona: ${persona.demographics.age}, ${persona.demographics.platform}`,
    },
  };
}

export default async function PersonaPage({ params }: PageProps) {
  const { slug } = await params;
  const persona = getPersonaBySlug(slug);

  if (!persona) {
    notFound();
  }

  const shareUrl = `https://spike.land/personas/${persona.slug}`;

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Back Link */}
      <Link
        href="/personas"
        className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to All Personas
      </Link>

      {/* Header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="text-6xl">{persona.emoji}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{persona.name}</h1>
            {persona.priority === "primary" && (
              <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                Priority Target
              </span>
            )}
          </div>
          <p className="text-xl text-muted-foreground italic">
            &ldquo;{persona.primaryHook}&rdquo;
          </p>
        </div>
      </div>

      {/* Warning Note */}
      {persona.note && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-lg mb-8">
          <strong>Note:</strong> {persona.note}
        </div>
      )}

      {/* Demographics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Age</div>
              <div className="font-medium">{persona.demographics.age}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Gender</div>
              <div className="font-medium">{persona.demographics.gender}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Income</div>
              <div className="font-medium">{persona.demographics.income}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Location</div>
              <div className="font-medium">{persona.demographics.location}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Platform</div>
              <div className="font-medium">{persona.demographics.platform}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Psychographics & Pain Points */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Psychographics</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {persona.psychographics.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-1">*</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pain Points</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {persona.painPoints.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-destructive mt-1">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Triggers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Triggers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {persona.triggers.map((trigger, i) => (
              <span
                key={i}
                className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm"
              >
                {trigger}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ad Copy Variations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ad Copy Variations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {persona.adCopyVariations.map((copy, i) => (
              <div
                key={i}
                className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary"
              >
                <p className="italic">&ldquo;{copy}&rdquo;</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Ideas */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Content Ideas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {persona.contentIdeas.map((idea, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary">+</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Share Section */}
      <div className="bg-muted/50 rounded-xl p-6 text-center">
        <h3 className="font-semibold mb-2">Share this persona</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Copy the link below to share with your team
        </p>
        <div className="flex items-center justify-center gap-2">
          <code className="bg-background px-4 py-2 rounded border text-sm flex-1 max-w-md overflow-hidden text-ellipsis">
            {shareUrl}
          </code>
          <CopyButton text={shareUrl} className="shrink-0" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-8 border-t">
        {(() => {
          const currentIndex = PERSONAS.findIndex((p) => p.slug === slug);
          const prevPersona = currentIndex > 0 ? PERSONAS[currentIndex - 1] : null;
          const nextPersona = currentIndex < PERSONAS.length - 1
            ? PERSONAS[currentIndex + 1]
            : null;

          return (
            <>
              {prevPersona
                ? (
                  <Link
                    href={`/personas/${prevPersona.slug}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="text-sm">Previous</span>
                    <div className="font-medium">{prevPersona.name}</div>
                  </Link>
                )
                : <div />}
              {nextPersona
                ? (
                  <Link
                    href={`/personas/${nextPersona.slug}`}
                    className="text-right text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="text-sm">Next</span>
                    <div className="font-medium">{nextPersona.name}</div>
                  </Link>
                )
                : <div />}
            </>
          );
        })()}
      </div>
    </div>
  );
}
