"use client";

import type { SkillDefinition } from "@/lib/create/skill-definitions";
import { motion } from "framer-motion";

interface SkillBadgeProps {
  skill: SkillDefinition;
  index: number;
}

export function SkillBadge({ skill, index }: SkillBadgeProps) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15, delay: index * 0.05 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${skill.colorClass}`}
      title={skill.description}
    >
      <span>{skill.icon}</span>
      <span>{skill.name}</span>
    </motion.span>
  );
}
