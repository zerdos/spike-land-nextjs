"use client";

import { PixelLogo } from "@/components/brand";
import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

export interface ComparisonImages {
  originalUrl: string;
  enhancedUrl: string;
}

export interface FeaturedAppCardProps {
  name: string;
  description: string;
  icon: ReactNode;
  href: string;
  featured?: boolean;
  tagline?: string;
  usePixelLogo?: boolean;
  comparisonImages?: ComparisonImages;
}

export function FeaturedAppCard({
  name,
  description,
  icon,
  href,
  featured = false,
  tagline,
  usePixelLogo = false,
  comparisonImages,
}: FeaturedAppCardProps) {
  return (
    <Card
      className={`group transition-all hover:scale-[1.02] ${
        featured
          ? "col-span-full md:col-span-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5"
          : ""
      }`}
      data-testid={featured ? "featured-app-card" : "app-card"}
    >
      <CardHeader className={featured ? "pb-4" : "pb-3"}>
        {usePixelLogo
          ? (
            <div className="mb-3">
              <PixelLogo size="lg" variant="horizontal" />
            </div>
          )
          : (
            <div
              className={`mb-3 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-lg transition-transform group-hover:scale-110 ${
                featured ? "h-16 w-16" : "h-14 w-14"
              }`}
            >
              {icon}
            </div>
          )}
        {!usePixelLogo && (
          <CardTitle className={featured ? "text-2xl" : "text-lg"}>
            {name}
          </CardTitle>
        )}
        {tagline && (
          <span className="text-sm text-primary font-medium">
            {tagline}
          </span>
        )}
        {featured && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary w-fit">
            Featured
          </span>
        )}
      </CardHeader>
      <CardContent className={featured ? "space-y-4" : ""}>
        <CardDescription
          className={`leading-relaxed ${featured ? "text-base" : "text-sm"}`}
        >
          {description}
        </CardDescription>
        {featured && comparisonImages && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border/50">
            <ImageComparisonSlider
              originalUrl={comparisonImages.originalUrl}
              enhancedUrl={comparisonImages.enhancedUrl}
              originalLabel="Before"
              enhancedLabel="After"
              width={16}
              height={9}
            />
          </div>
        )}
        {featured && (
          <Button asChild className="mt-4">
            <Link href={href}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        {!featured && (
          <Button asChild variant="ghost" size="sm" className="mt-4 -ml-2">
            <Link href={href}>
              Learn More
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
