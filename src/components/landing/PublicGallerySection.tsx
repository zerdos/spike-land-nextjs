"use client";

import { ScrollReveal } from "@/components/orbit-landing/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { PublicPhoto } from "@/lib/gallery/public-photos";
import { ArrowRight, ImageIcon } from "lucide-react";
import Image from "next/image";

interface PublicGallerySectionProps {
  photos: PublicPhoto[];
}

export function PublicGallerySection({ photos }: PublicGallerySectionProps) {
  if (photos.length === 0) return null;

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 rounded-lg bg-white/5 border border-white/10 text-fuchsia-400">
              <ImageIcon className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium text-fuchsia-400">
              Pixel Gallery
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Enhanced with{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Pixel
            </span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-lg text-white/60 mb-12 max-w-2xl">
            AI-powered image enhancement that brings your photos to life.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex-shrink-0 w-64 h-64 relative rounded-xl overflow-hidden snap-start group"
                >
                  <Image
                    src={photo.enhancedUrl ?? photo.originalUrl}
                    alt={photo.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="256px"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-sm font-medium truncate">
                      {photo.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <div className="mt-12 text-center">
            <Button
              asChild
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white gap-2 group"
            >
              <Link href="/pixel">
                Try Pixel
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
