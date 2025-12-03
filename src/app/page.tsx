"use client"

import { Button } from "@/components/ui/button"
import { Sparkles, Rocket, ArrowRight } from "lucide-react"
import Link from "next/link"
import { AuthHeader } from "@/components/auth/auth-header"
import {
  HeroSection,
  BeforeAfterGallery,
  FeatureShowcase,
  ComponentDemo,
  FAQ,
} from "@/components/landing"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Auth Header - Fixed top-right */}
      <AuthHeader />

      {/* Hero Section */}
      <HeroSection />

      {/* Before/After Gallery - Key selling point */}
      <BeforeAfterGallery />

      {/* Feature Showcase */}
      <FeatureShowcase />

      {/* Component Demo - Validates Tailwind/shadcn */}
      <ComponentDemo />

      {/* FAQ Section */}
      <FAQ />

      {/* Final CTA Section */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Transform Your Images?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg opacity-90">
            Join thousands of creators using AI to enhance their photos.
            Get started for free with your first enhancement on us.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" variant="secondary" className="text-base">
              <Link href="/enhance">
                <Rocket className="mr-2 h-5 w-5" />
                Start Enhancing Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/pricing">
                <Sparkles className="mr-2 h-5 w-5" />
                View Pricing
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
