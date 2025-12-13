"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="bg-gradient-primary py-20 text-primary-foreground relative overflow-hidden">
      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="mb-6 text-3xl font-bold sm:text-4xl">Ready to Transform Your Images?</h2>
        <p className="mx-auto mb-10 max-w-2xl text-lg opacity-95 leading-relaxed">
          Join thousands of creators using AI to enhance their photos. Get started for free with
          your first enhancement on us.
        </p>
        <div className="flex flex-col gap-5 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="text-base font-semibold shadow-xl"
          >
            <Link href="/auth/signin?callbackUrl=/apps/pixel">
              <Rocket className="mr-2 h-5 w-5" />
              Start Enhancing Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/50 font-semibold backdrop-blur-sm"
          >
            <Link href="/pricing">
              <Sparkles className="mr-2 h-5 w-5" />
              View Pricing
            </Link>
          </Button>
        </div>
      </div>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 h-64 w-64 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 bg-white/5 rounded-full blur-3xl" />
    </section>
  );
}
