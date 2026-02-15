import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AudioLines,
  BarChart3,
  Box,
  Bug,
  Calendar,
  CalendarClock,
  Eye,
  GitBranch,
  Layers,
  Lock,
  Megaphone,
  Paintbrush,
  Palette,
  PenTool,
  Rocket,
  Share2,
  Sparkles,
  TrendingUp,
  Upload,
  Workflow,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Activity,
  AudioLines,
  BarChart3,
  Box,
  Bug,
  Calendar,
  CalendarClock,
  Eye,
  GitBranch,
  Layers,
  Lock,
  Megaphone,
  Paintbrush,
  Palette,
  PenTool,
  Rocket,
  Share2,
  Sparkles,
  TrendingUp,
  Upload,
  Workflow,
};

export function getStoreIcon(name: string): LucideIcon {
  return iconMap[name] ?? Box;
}
