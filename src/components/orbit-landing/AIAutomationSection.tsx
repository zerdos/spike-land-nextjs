"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { Bot, FileText, Sparkles, Star, Zap } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

/**
 * AIAutomationSection - Showcases Relay drafts and Allocator autopilot
 *
 * Split panel design showing:
 * - Left: AI-generated draft content (Relay)
 * - Right: Autopilot toggle and automation settings (Allocator)
 */

function RelayDraftPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">AI Draft Generator</h4>
              <p className="text-sm text-white/50">Relay creates content that matches your voice</p>
            </div>
          </div>

          {/* Mock drafts */}
          <div className="space-y-3">
            {/* Recommended draft */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-xs font-medium text-amber-400">Recommended</span>
              </div>
              <p className="text-sm text-white/70 line-clamp-2">
                🚀 Just launched our new AI features! Check out how we&apos;re helping creators grow
                their audience 10x faster...
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-400 border-green-500/20 text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  95% match
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs"
                >
                  Tone: 87%
                </Badge>
              </div>
            </div>

            {/* Alternative draft */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 opacity-60">
              <p className="text-sm text-white/70 line-clamp-2">
                We&apos;ve been working on something special. Our AI now helps you create content
                that actually resonates...
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  82% match
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AllocatorAutopilotPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
    >
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Bot className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Smart Autopilot</h4>
              <p className="text-sm text-white/50">Allocator handles posting for you</p>
            </div>
          </div>

          {/* Autopilot toggle */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={true} className="data-[state=checked]:bg-cyan-500" />
                <span className="text-sm font-medium text-white">Autopilot Mode</span>
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                <Zap className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>

          {/* Automation stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Posts scheduled", value: "24", change: "+8 this week" },
              { label: "Best time posted", value: "92%", change: "optimal timing" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <span className="text-2xl font-bold text-white">{stat.value}</span>
                <p className="text-xs text-white/50">{stat.label}</p>
                <p className="text-xs text-cyan-400 mt-1">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Activity indicator */}
          <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            Next post in 2h 34m
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AIAutomationSection() {
  return (
    <section className="relative py-24 bg-zinc-900">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="container relative mx-auto px-4">
        <ScrollReveal className="text-center mb-16">
          <Badge className="mb-4 bg-white/5 text-white/70 border-white/10">
            Powered by AI
          </Badge>
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
            Let AI Handle the Heavy Lifting
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            From generating on-brand content to scheduling at the perfect moment, our AI agents work
            around the clock so you don&apos;t have to.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div>
            <ScrollReveal delay={0.1}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-purple-500/10">
                  <FileText className="w-4 h-4 text-purple-400" />
                </span>
                Relay: AI Content Creation
              </h3>
            </ScrollReveal>
            <RelayDraftPreview />
          </div>

          <div>
            <ScrollReveal delay={0.2}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-cyan-500/10">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </span>
                Allocator: Smart Scheduling
              </h3>
            </ScrollReveal>
            <AllocatorAutopilotPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
