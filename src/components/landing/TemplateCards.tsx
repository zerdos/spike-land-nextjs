"use client";

import { motion } from "framer-motion";

const TEMPLATES = [
  { emoji: "\uD83C\uDFAE", label: "Game", prompt: "Build a fun browser game" },
  { emoji: "\uD83D\uDCCA", label: "Dashboard", prompt: "Create a data dashboard with charts" },
  { emoji: "\u2705", label: "Todo App", prompt: "Build a todo app with drag and drop" },
  { emoji: "\uD83C\uDFB5", label: "Music Player", prompt: "Design a music player with visualizer" },
  { emoji: "\uD83E\uDDCA", label: "3D Scene", prompt: "Make an interactive 3D scene" },
  { emoji: "\uD83D\uDDBC\uFE0F", label: "Gallery", prompt: "Create a photo gallery with lightbox" },
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 * index }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(template.prompt)}
          className="glass-0 px-3 py-1.5 rounded-full text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
        >
          <span>{template.emoji}</span>
          <span>{template.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
