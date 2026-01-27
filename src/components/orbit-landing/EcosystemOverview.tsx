"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Activity, Bot, Brain, Calendar, FileText, Inbox } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

/**
 * EcosystemOverview - Bento grid showcasing all Orbit features
 *
 * Layout:
 * +-------------------+----------+
 * |     PULSE         |  INBOX   |
 * |    (2x2)          |  (1x1)   |
 * +-------------------+----------+
 * | ALLOCATOR | RELAY | CALENDAR |
 * |   (1x1)   | (1x1) |  (1x1)   |
 * +-----------+-------+----------+
 * |     BRAND BRAIN (2x1)        |
 * +------------------------------+
 */

interface FeatureItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  gridClass: string;
}

const features: FeatureItem[] = [
  {
    id: "pulse",
    name: "Pulse",
    description:
      "Real-time health monitoring and anomaly detection across all your social accounts. Never miss a trend or issue.",
    icon: <Activity className="w-8 h-8" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "hover:border-emerald-500/30",
    gridClass: "col-span-2 row-span-2",
  },
  {
    id: "inbox",
    name: "Inbox",
    description: "Unified messages from all platforms in one place.",
    icon: <Inbox className="w-6 h-6" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "hover:border-blue-500/30",
    gridClass: "col-span-1 row-span-1",
  },
  {
    id: "allocator",
    name: "Allocator",
    description: "AI-powered scheduling that posts at optimal times.",
    icon: <Bot className="w-6 h-6" />,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "hover:border-cyan-500/30",
    gridClass: "col-span-1 row-span-1",
  },
  {
    id: "relay",
    name: "Relay",
    description: "Generate on-brand content with AI that learns your voice.",
    icon: <FileText className="w-6 h-6" />,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "hover:border-purple-500/30",
    gridClass: "col-span-1 row-span-1",
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Visual content calendar with drag-and-drop scheduling.",
    icon: <Calendar className="w-6 h-6" />,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "hover:border-orange-500/30",
    gridClass: "col-span-1 row-span-1",
  },
  {
    id: "brand-brain",
    name: "Brand Brain",
    description:
      "Your AI learns your brand voice, guidelines, and style to ensure every piece of content feels authentically you.",
    icon: <Brain className="w-6 h-6" />,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "hover:border-pink-500/30",
    gridClass: "col-span-2 row-span-1",
  },
];

function FeatureCard({ feature }: { feature: FeatureItem; }) {
  const isLarge = feature.gridClass.includes("2x2") || feature.gridClass.includes("row-span-2");

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(feature.gridClass, "h-full")}
    >
      <Card
        className={cn(
          "h-full bg-zinc-900/50 border-white/10 transition-all duration-300",
          "hover:bg-zinc-900/80 hover:shadow-lg",
          feature.borderColor,
        )}
      >
        <CardContent className={cn("h-full flex flex-col", isLarge ? "p-6" : "p-5")}>
          {/* Icon */}
          <div
            className={cn(
              "p-2.5 rounded-xl w-fit mb-4",
              feature.bgColor,
            )}
          >
            <span className={feature.color}>{feature.icon}</span>
          </div>

          {/* Title */}
          <h3
            className={cn(
              "font-semibold text-white mb-2",
              isLarge ? "text-xl" : "text-base",
            )}
          >
            {feature.name}
          </h3>

          {/* Description */}
          <p
            className={cn(
              "text-white/60 leading-relaxed",
              isLarge ? "text-base" : "text-sm",
              !isLarge && "line-clamp-2",
            )}
          >
            {feature.description}
          </p>

          {/* Additional content for large cards */}
          {feature.id === "pulse" && (
            <div className="mt-auto pt-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Platforms", value: "5" },
                  { label: "Metrics", value: "12+" },
                  { label: "Alerts", value: "24/7" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                    <p className="text-xs text-white/40 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function EcosystemOverview() {
  return (
    <section className="relative py-24 bg-zinc-900">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-white/[0.02] to-transparent rounded-full" />
      </div>

      <div className="container relative mx-auto px-4">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
            One Platform, Complete Control
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Six powerful tools working together to help you grow, engage, and succeed on every
            social platform.
          </p>
        </ScrollReveal>

        {/* Bento Grid */}
        <StaggerContainer
          className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto auto-rows-fr"
          staggerDelay={0.1}
        >
          {features.map((feature) => (
            <StaggerItem key={feature.id} preset="scale">
              <FeatureCard feature={feature} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
