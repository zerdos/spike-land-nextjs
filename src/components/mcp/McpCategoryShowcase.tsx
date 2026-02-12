"use client";

import { motion, type Variants } from "framer-motion";
import {
  Bot,
  Code2,
  Compass,
  ImagePlus,
  Network,
} from "lucide-react";
import type React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { MCP_CATEGORIES, type McpCategory } from "./mcp-tool-registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass,
  ImagePlus,
  Code2,
  Bot,
  Network,
};

interface McpCategoryShowcaseProps {
  onCategorySelect?: (categoryId: string) => void;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

function CategoryCard({
  category,
  onSelect,
}: {
  category: McpCategory;
  onSelect?: (id: string) => void;
}) {
  const Icon = ICON_MAP[category.icon];
  const isActive = category.toolCount > 0;

  return (
    <motion.div variants={cardVariants}>
      <Card
        variant={category.color}
        className={
          isActive
            ? "cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
            : "cursor-default opacity-50"
        }
        onClick={isActive ? () => onSelect?.(category.id) : undefined}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            {Icon && <Icon className="h-6 w-6" />}
            {isActive && (
              <Badge variant="secondary">
                {category.toolCount} {category.toolCount === 1 ? "tool" : "tools"}
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg">{category.name}</CardTitle>
          <CardDescription className="text-white/70">
            {category.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-xs">
            {category.tier === "free" ? "Free Tier" : "Workspace"}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function McpCategoryShowcase({
  onCategorySelect,
}: McpCategoryShowcaseProps) {
  return (
    <section className="space-y-12">
      <h2 className="text-center text-3xl font-bold tracking-tight">
        Tool Categories
      </h2>

      <motion.div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {MCP_CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onSelect={onCategorySelect}
          />
        ))}
      </motion.div>
    </section>
  );
}
