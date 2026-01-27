"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { useSession } from "next-auth/react";

/**
 * OrbitHero - Hero section for the Orbit landing page
 *
 * Features:
 * - Animated gradient mesh background (cyan/fuchsia/purple)
 * - Staggered text reveal with Framer Motion
 * - Clear CTA to get started with Orbit
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary gradient orb - cyan */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/30 rounded-full blur-[120px]"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary gradient orb - fuchsia */}
      <motion.div
        className="absolute top-1/3 -left-32 w-80 h-80 bg-fuchsia-500/25 rounded-full blur-[100px]"
        animate={{
          x: [0, -20, 0],
          y: [0, 30, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Tertiary gradient orb - purple */}
      <motion.div
        className="absolute -bottom-20 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-[80px]"
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Grid overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

export function OrbitHero() {
  const { data: session } = useSession();
  const orbitHref = session ? "/orbit" : "/orbit";

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-zinc-950">
      <GradientMesh />

      <div className="container relative mx-auto px-4 py-20 sm:py-32">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70">
              <Zap className="w-4 h-4 text-cyan-400" />
              AI-Powered Social Media Management
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            variants={itemVariants}
            className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            <span className="text-white">Your Social</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
              Command Center
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="mx-auto mb-8 max-w-2xl text-lg text-white/60 sm:text-xl leading-relaxed"
          >
            Connect every platform. Automate with AI. Grow without limits.
            <br className="hidden sm:block" />
            <span className="text-white/40">
              Manage all your social accounts from one intelligent dashboard.
            </span>
          </motion.p>

          {/* Stats row */}
          <motion.div
            variants={itemVariants}
            className="mb-10 flex flex-wrap justify-center gap-8 text-center"
          >
            {[
              { value: "5+", label: "Platforms" },
              { value: "AI", label: "Autopilot" },
              { value: "24/7", label: "Monitoring" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-sm text-white/40">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button
              asChild
              size="lg"
              className="text-lg font-semibold px-8 py-6 bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 border-0"
            >
              <Link href={orbitHref}>
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg font-semibold px-8 py-6 border-white/20 text-white hover:bg-white/5"
            >
              <Link href="/blog/orbit-introduction">
                See How It Works
              </Link>
            </Button>
          </motion.div>

          {/* Trust indicator */}
          <motion.p
            variants={itemVariants}
            className="mt-8 text-sm text-white/40"
          >
            Free to start — no credit card required
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
