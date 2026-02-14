"use client";

import { motion, type Variants } from "framer-motion";
import {
  AppWindow,
  BookOpen,
  Bot,
  Briefcase,
  Code2,
  Coins,
  Compass,
  CreditCard,
  FileText,
  FolderOpen,
  GitBranch,
  ImagePlus,
  Lock,
  MessageSquare,
  Music,
  Network,
  Palette,
  PlusCircle,
  Rocket,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Store,
  Terminal,
  Users,
  Volume2,
  Wrench,
  Zap,
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
import { cn } from "@/lib/utils";

import { MCP_CATEGORIES, type McpCategory } from "./mcp-tool-registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  AppWindow, BookOpen, Bot, Briefcase, Code2, Coins, Compass, CreditCard,
  FileText, FolderOpen, GitBranch, ImagePlus, Lock, MessageSquare, Music,
  Network, Palette, PlusCircle, Rocket, Search, Send, Settings, Shield,
  Sparkles, Store, Terminal, Users, Volume2, Wrench, Zap,
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
    <motion.div
      variants={cardVariants}
      whileHover={isActive ? {
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      } : undefined}
      className="h-full"
    >
      <Card
        variant={category.color}
        className={cn(
          "h-full flex flex-col",
          isActive
            ? "cursor-pointer transition-transform duration-200"
            : "cursor-default opacity-50"
        )}
        onClick={isActive ? () => onSelect?.(category.id) : undefined}
      >
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            {Icon && <Icon className="h-6 w-6" />}
            {isActive && (
              <Badge variant="secondary" className="bg-black/20 hover:bg-black/30 border-white/10 text-white">
                {category.toolCount} {category.toolCount === 1 ? "tool" : "tools"}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">{category.name}</CardTitle>
          <CardDescription className="text-white/80 leading-relaxed pt-2">
            {category.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow" />
      </Card>
    </motion.div>
  );
}

export function McpCategoryShowcase({
  onCategorySelect,
}: McpCategoryShowcaseProps) {
  return (
    <section className="space-y-12 container mx-auto px-4">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Tool Categories
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Explore our comprehensive suite of AI tools designed for seamless integration.
        </p>
      </div>

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
