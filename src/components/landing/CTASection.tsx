"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="bg-gradient-primary py-20 text-primary-foreground relative overflow-hidden">
      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
          Christmas is coming.
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-lg opacity-95 leading-relaxed">
          Dig out those old photos before the family visits. Restore them. Impress your grandma.
          Maybe make someone cry (in a good way — it&apos;s happened).
        </p>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="text-base font-semibold shadow-xl"
        >
          <Link href="/pixel">
            <Sparkles className="mr-2 h-5 w-5" />
            Try Pixel for free
          </Link>
        </Button>
      </div>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 h-64 w-64 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 bg-white/5 rounded-full blur-3xl" />
    </section>
  );
}
