import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Code2, Globe, Layers, Zap, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EditorMockup } from "@/components/landing-sections/mockups/EditorMockup";
import { FALLBACK_GALLERY_ITEMS } from "@/components/landing/gallery-fallback-data";

export const metadata: Metadata = {
  title: "Portfolio | Spike Land",
  description: "Case studies for Pixel, Vibe Coding, and Orbit. Exploring the tech stacks and results of our latest projects.",
};

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      {/* Hero Section */}
      <section className="relative py-24 px-6 md:px-12 lg:px-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1 text-sm uppercase tracking-widest">
            Our Work
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-transparent">
            Building the Future <br /> with AI & Design.
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            A showcase of our most ambitious projects, pushing the boundaries of what's possible with modern web technologies.
          </p>
        </div>
      </section>

      {/* Case Study 1: Pixel */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-zinc-900/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <Layers className="w-6 h-6 text-indigo-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Pixel</h2>
            </div>

            <p className="text-lg text-zinc-400 leading-relaxed">
              Pixel is a cutting-edge AI-powered image enhancement tool designed to transform low-resolution images into stunning high-quality photos. It leverages advanced machine learning models to upscale, denoise, and restore images with incredible detail.
            </p>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {["Next.js 15", "React", "Tailwind CSS", "Python AI Models", "Vercel"].map((tech) => (
                  <Badge key={tech} variant="outline" className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Key Results</h3>
              <ul className="space-y-2">
                {[
                  "Processed over 1M+ images",
                  "99% User Satisfaction Rate",
                  "40% Faster Processing Time"
                ].map((result, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    {result}
                  </li>
                ))}
              </ul>
            </div>

            <Button asChild className="mt-4" variant="default">
              <Link href="/pixel">
                View Project <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl aspect-[16/9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={FALLBACK_GALLERY_ITEMS[1]?.enhancedUrl ?? ""}
                alt="Pixel Enhancement Result"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent flex items-end p-6">
                <p className="text-white font-medium">AI-Enhanced Landscape Output</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Study 2: Vibe Coding */}
      <section className="py-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="lg:order-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <Code2 className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Vibe Coding</h2>
            </div>

            <p className="text-lg text-zinc-400 leading-relaxed">
              Vibe Coding redefines the developer experience by integrating AI directly into the coding workflow. It acts as an intelligent pair programmer that understands context, suggests optimizations, and automates repetitive tasks, allowing developers to focus on creative problem-solving.
            </p>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {["TypeScript", "Monaco Editor", "OpenAI API", "WebSockets", "Node.js"].map((tech) => (
                  <Badge key={tech} variant="outline" className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Key Results</h3>
              <ul className="space-y-2">
                {[
                  "30% Increase in Coding Speed",
                  "Reduced Bug Density",
                  "Adopted by Thousands of Devs"
                ].map((result, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    {result}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:order-1 relative">
             <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-500" />
             <div className="relative transform rotate-1 hover:rotate-0 transition-all duration-500">
                <EditorMockup />
             </div>
          </div>
        </div>
      </section>

      {/* Case Study 3: Orbit */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-zinc-900/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                <Globe className="w-6 h-6 text-cyan-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Orbit</h2>
            </div>

            <p className="text-lg text-zinc-400 leading-relaxed">
              Orbit is a comprehensive Social Media Command Center that empowers brands to manage their online presence efficiently. From content scheduling and A/B testing to AI-driven analytics, Orbit provides a unified platform for growth.
            </p>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {["Next.js", "Prisma", "PostgreSQL", "Framer Motion", "Recharts"].map((tech) => (
                  <Badge key={tech} variant="outline" className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Key Results</h3>
              <ul className="space-y-2">
                {[
                  "25% Avg. Audience Growth",
                  "10+ Hours Saved Weekly",
                  "Unified Analytics Dashboard"
                ].map((result, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    {result}
                  </li>
                ))}
              </ul>
            </div>

            <Button asChild className="mt-4" variant="default">
              <Link href="/orbit">
                Explore Orbit <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <Card className="relative bg-zinc-950 border-white/10 overflow-hidden aspect-video flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-zinc-900/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20" />
                </div>
                <div className="h-4 w-32 bg-white/5 rounded-full" />
              </div>
              <div className="flex-1 p-6 grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                  <div className="h-32 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 p-4">
                    <div className="h-4 w-24 bg-cyan-500/20 rounded mb-2" />
                    <div className="flex items-end gap-2 h-20">
                       {[40, 60, 45, 70, 50, 80, 65].map((h, i) => (
                         <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-cyan-500/40 rounded-t-sm" />
                       ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="h-24 rounded-xl bg-zinc-900 border border-white/5 p-3">
                        <div className="h-8 w-8 rounded bg-fuchsia-500/20 mb-2 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-fuchsia-400" />
                        </div>
                        <div className="h-3 w-16 bg-white/10 rounded" />
                     </div>
                     <div className="h-24 rounded-xl bg-zinc-900 border border-white/5 p-3">
                        <div className="h-8 w-8 rounded bg-purple-500/20 mb-2 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="h-3 w-16 bg-white/10 rounded" />
                     </div>
                  </div>
                </div>
                <div className="col-span-1 space-y-3">
                   {[1, 2, 3].map((i) => (
                     <div key={i} className="h-16 rounded-xl bg-zinc-900 border border-white/5 p-3 flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/5" />
                        <div className="space-y-1">
                           <div className="h-2 w-12 bg-white/10 rounded" />
                           <div className="h-2 w-8 bg-white/5 rounded" />
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to build something amazing?</h2>
        <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
          Let's collaborate to bring your vision to life with the same level of care and expertise.
        </p>
        <Button size="lg" className="rounded-full px-8 h-12 text-base">
          Get in Touch
        </Button>
      </section>
    </main>
  );
}
