"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { motion } from "framer-motion";
import { ArrowRight, Rocket } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

/**
 * OrbitCTA - Final call-to-action section for the Orbit landing page
 *
 * Features gradient background and compelling messaging to drive signups.
 */

export function OrbitCTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[150px]"
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[150px]"
        animate={{
          x: [0, -50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="container relative mx-auto px-4 text-center">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/5 border border-white/10">
            <Rocket className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white/70">Launch your social growth</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl mb-6">
            Ready to Take Control?
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="mx-auto max-w-xl text-lg text-white/60 mb-10 leading-relaxed">
            Join creators and businesses who are growing smarter with Orbit. Connect your accounts
            and start automating in under 2 minutes.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="text-lg font-semibold px-8 py-6 bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 border-0"
            >
              <Link href="/orbit">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg font-semibold px-8 py-6 border-white/20 text-white hover:bg-white/5"
            >
              <Link href="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <p className="mt-8 text-sm text-white/40">
            No credit card required • Free forever up to 3 accounts
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
