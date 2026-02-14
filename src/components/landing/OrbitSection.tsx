"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ArrowRight, Inbox, Activity, Brain } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Activity,
    title: "Pulse",
    description: "Real-time analytics across every social channel in one dashboard",
    gradient: "from-fuchsia-500/20 to-purple-500/20",
    hoverGlow: "rgba(217,70,239,0.2)",
    hoverColor: "group-hover:text-fuchsia-400",
  },
  {
    icon: Inbox,
    title: "Inbox",
    description: "Unified inbox for comments, DMs, and mentions — never miss a conversation",
    gradient: "from-purple-500/20 to-cyan-500/20",
    hoverGlow: "rgba(168,85,247,0.2)",
    hoverColor: "group-hover:text-purple-400",
  },
  {
    icon: Brain,
    title: "Brand Brain",
    description: "AI that learns your voice and drafts on-brand replies in seconds",
    gradient: "from-cyan-500/20 to-fuchsia-500/20",
    hoverGlow: "rgba(6,182,212,0.2)",
    hoverColor: "group-hover:text-cyan-400",
  },
];

export function OrbitSection() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="container relative mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-sm text-fuchsia-400 mb-8"
          >
            <Activity className="w-4 h-4" />
            <span className="font-semibold tracking-widest uppercase text-[10px]">Social Media Command Center</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-7xl font-bold text-white mb-8 tracking-tight"
          >
            Meet{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Orbit
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-zinc-500 mb-16 max-w-2xl mx-auto font-light"
          >
            Manage every social channel from one place. AI-powered replies, real-time analytics, and unified messaging — built for teams that move fast.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className={`group relative rounded-[2rem] bg-gradient-to-br ${feature.gradient} border border-white/5 p-8 text-left overflow-hidden`}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at center, ${feature.hoverGlow} 0%, transparent 70%)`,
                  }}
                />
                <div className="relative z-10">
                  <feature.icon className={`w-8 h-8 text-zinc-500 ${feature.hoverColor} transition-colors mb-4`} />
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold border-0 gap-3 group px-10 h-16 rounded-2xl transition-all duration-300 shadow-xl shadow-fuchsia-500/10"
            >
              <Link href="/orbit">
                Explore Orbit
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
