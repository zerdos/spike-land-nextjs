"use client";

import { ScrollReveal } from "@/components/orbit-landing/ScrollReveal";

const stats = [
  { label: "4 Apps" },
  { label: "65+ MCP Tools" },
  { label: "$10 each" },
];

export function StoreHero() {
  return (
    <ScrollReveal>
      <section className="relative overflow-hidden py-24">
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-10 h-72 w-72 animate-pulse rounded-full bg-cyan-500 opacity-20 blur-3xl" />
          <div className="absolute -right-20 top-32 h-96 w-96 animate-pulse rounded-full bg-blue-600 opacity-15 blur-3xl [animation-delay:1s]" />
          <div className="absolute -bottom-10 left-1/3 h-64 w-64 animate-pulse rounded-full bg-indigo-500 opacity-10 blur-3xl [animation-delay:2s]" />
        </div>

        <div className="container relative mx-auto max-w-3xl px-6 text-center">
          <h1 className="mb-6 text-5xl font-black md:text-6xl">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              App Store
            </span>
          </h1>

          <p className="mb-10 text-xl leading-relaxed text-zinc-400">
            MCP-powered apps that supercharge your workflow. Each app bundles
            powerful tool categories into one seamless experience.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {stats.map((stat) => (
              <span
                key={stat.label}
                className="rounded-full bg-white/5 px-5 py-2 text-sm text-zinc-300"
              >
                {stat.label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
