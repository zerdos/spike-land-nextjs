"use client";

import { motion } from "framer-motion";

const TEMPLATES = [
  {
    emoji: "\uD83C\uDFAE",
    label: "Game",
    prompt: "Build a fun browser game",
    color: "purple",
    borderClass: "border-purple-400/20",
    bgClass: "bg-purple-500/8",
    textClass: "text-purple-300",
    glowRgba: "168,85,247",
  },
  {
    emoji: "\uD83D\uDCCA",
    label: "Dashboard",
    prompt: "Create a data dashboard with charts",
    color: "green",
    borderClass: "border-emerald-400/20",
    bgClass: "bg-emerald-500/8",
    textClass: "text-emerald-300",
    glowRgba: "52,211,153",
  },
  {
    emoji: "\u2705",
    label: "Todo App",
    prompt: "Build a todo app with drag and drop",
    color: "cyan",
    borderClass: "border-cyan-400/20",
    bgClass: "bg-cyan-500/8",
    textClass: "text-cyan-300",
    glowRgba: "34,211,238",
  },
  {
    emoji: "\uD83C\uDFB5",
    label: "Music Player",
    prompt: "Design a music player with visualizer",
    color: "pink",
    borderClass: "border-pink-400/20",
    bgClass: "bg-pink-500/8",
    textClass: "text-pink-300",
    glowRgba: "244,114,182",
  },
  {
    emoji: "\uD83E\uDDCA",
    label: "3D Scene",
    prompt: "Make an interactive 3D scene",
    color: "blue",
    borderClass: "border-blue-400/20",
    bgClass: "bg-blue-500/8",
    textClass: "text-blue-300",
    glowRgba: "96,165,250",
  },
  {
    emoji: "\uD83D\uDDBC\uFE0F",
    label: "Gallery",
    prompt: "Create a photo gallery with lightbox",
    color: "amber",
    borderClass: "border-amber-400/20",
    bgClass: "bg-amber-500/8",
    textClass: "text-amber-300",
    glowRgba: "251,191,36",
  },
];

interface TemplateCardsProps {
  onSelect: (prompt: string) => void;
}

export function TemplateCards({ onSelect }: TemplateCardsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {TEMPLATES.map((template, index) => (
        <motion.button
          key={template.label}
          type="button"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 * index }}
          whileHover={{
            y: -2,
            transition: { type: "spring", stiffness: 400, damping: 25 },
          }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(template.prompt)}
          className={`border ${template.borderClass} ${template.bgClass} ${template.textClass} px-3 py-1.5 rounded-full text-sm hover:text-white transition-all flex items-center gap-1.5`}
          style={{
            // @ts-expect-error CSS custom property for hover glow
            "--template-glow": `rgba(${template.glowRgba},0.3)`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px rgba(${template.glowRgba},0.3)`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <span>{template.emoji}</span>
          <span>{template.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
