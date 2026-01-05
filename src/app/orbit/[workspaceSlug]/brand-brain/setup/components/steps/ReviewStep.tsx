"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BrandProfileFormData } from "@/lib/validations/brand-brain";
import {
  GUARDRAIL_TYPE_LABELS,
  VOCABULARY_TYPE_LABELS,
  VOICE_DIMENSION_LABELS,
} from "@/lib/validations/brand-brain";
import { Edit2 } from "lucide-react";
import Image from "next/image";
import { useFormContext } from "react-hook-form";

interface ReviewStepProps {
  disabled?: boolean;
  onEditStep: (step: number) => void;
}

export function ReviewStep({ disabled: _disabled = false, onEditStep }: ReviewStepProps) {
  const form = useFormContext<BrandProfileFormData>();
  const data = form.getValues();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review Your Brand Profile</h2>
        <p className="text-sm text-muted-foreground">
          Review your brand configuration before saving. Click &quot;Edit&quot; on any section to
          make changes.
        </p>
      </div>

      <div className="space-y-4">
        {/* Brand Basics */}
        <ReviewCard title="Brand Basics" onEdit={() => onEditStep(0)}>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Brand Name
              </span>
              <p className="font-medium">{data.name || "Not set"}</p>
            </div>

            {data.mission && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Mission
                </span>
                <p className="text-sm">{data.mission}</p>
              </div>
            )}

            {data.values && data.values.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Values
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.values.map((value, i) => (
                    <Badge key={i} variant="secondary">
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ReviewCard>

        {/* Voice & Tone */}
        <ReviewCard title="Voice & Tone" onEdit={() => onEditStep(1)}>
          <div className="space-y-2">
            {Object.entries(VOICE_DIMENSION_LABELS).map(([key, labels]) => {
              const value = data.toneDescriptors?.[
                key as keyof typeof data.toneDescriptors
              ] ?? 50;
              const percentage = value;
              const isLeftHeavy = value < 50;
              const isRightHeavy = value > 50;

              return (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-24 text-right text-xs",
                      isLeftHeavy ? "font-medium" : "text-muted-foreground",
                    )}
                  >
                    {labels.left}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={cn(
                      "w-24 text-xs",
                      isRightHeavy ? "font-medium" : "text-muted-foreground",
                    )}
                  >
                    {labels.right}
                  </span>
                </div>
              );
            })}
          </div>
        </ReviewCard>

        {/* Visual Identity */}
        <ReviewCard title="Visual Identity" onEdit={() => onEditStep(2)}>
          <div className="space-y-4">
            {/* Logo */}
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Logo
              </span>
              {data.logoUrl
                ? (
                  <div className="mt-1 inline-block overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={data.logoUrl}
                      alt="Brand logo"
                      width={80}
                      height={80}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )
                : <p className="text-sm text-muted-foreground">No logo uploaded</p>}
            </div>

            {/* Color Palette */}
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Color Palette
              </span>
              {data.colorPalette && data.colorPalette.length > 0
                ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {data.colorPalette.map((color, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md border bg-card px-2 py-1"
                      >
                        <div
                          className="h-4 w-4 rounded-sm border"
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
            </div>
          </div>
        </ReviewCard>

        {/* Guardrails */}
        <ReviewCard title="Content Guardrails" onEdit={() => onEditStep(3)}>
          <div className="space-y-3">
            {/* Guardrails by type */}
            {(["PROHIBITED_TOPIC", "REQUIRED_DISCLOSURE", "CONTENT_WARNING"] as const).map(
              (type) => {
                const items = data.guardrails?.filter((g) => g.type === type) || [];
                if (items.length === 0) return null;

                return (
                  <div key={type}>
                    <span className="text-xs font-medium text-muted-foreground">
                      {GUARDRAIL_TYPE_LABELS[type]}s
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {items.map((item, i) => (
                        <Badge key={i} variant="outline">
                          {item.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              },
            )}

            {/* Vocabulary by type */}
            {(["PREFERRED", "BANNED", "REPLACEMENT"] as const).map((type) => {
              const items = data.vocabulary?.filter((v) => v.type === type) || [];
              if (items.length === 0) return null;

              return (
                <div key={type}>
                  <span className="text-xs font-medium text-muted-foreground">
                    {VOCABULARY_TYPE_LABELS[type]}s
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {items.map((item, i) => (
                      <Badge key={i} variant="secondary">
                        {type === "REPLACEMENT"
                          ? `${item.term} → ${item.replacement}`
                          : item.term}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}

            {(!data.guardrails || data.guardrails.length === 0) &&
              (!data.vocabulary || data.vocabulary.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No guardrails or vocabulary rules configured
              </p>
            )}
          </div>
        </ReviewCard>
      </div>
    </div>
  );
}

interface ReviewCardProps {
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
}

function ReviewCard({ title, children, onEdit }: ReviewCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8"
        >
          <Edit2 className="mr-1 h-3 w-3" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
