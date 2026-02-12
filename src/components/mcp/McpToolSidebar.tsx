"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AppWindow,
  Bot,
  Calendar,
  ChevronDown,
  Code2,
  Compass,
  FileText,
  ImagePlus,
  Inbox,
  Menu,
  Music,
  Network,
  Palette,
  Search,
  Send,
  Share2,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import type { McpToolDef } from "@/components/mcp/mcp-tool-registry";
import { MCP_CATEGORIES, getToolsByCategory } from "@/components/mcp/mcp-tool-registry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Compass,
  ImagePlus,
  Code2,
  Bot,
  Network,
  Palette,
  AppWindow,
  Sparkles,
  FileText,
  Music,
  Activity,
  Inbox,
  Calendar,
  Search,
  Zap,
  Shield,
  Send,
  Share2,
  Users,
};

interface McpToolSidebarProps {
  selectedTool: McpToolDef | null;
  onSelectTool: (tool: McpToolDef) => void;
  initialCategory?: string;
}

function SidebarContent({
  selectedTool,
  onSelectTool,
  initialCategory,
  onToolClick,
}: McpToolSidebarProps & { onToolClick?: () => void }) {
  const categoriesWithTools = MCP_CATEGORIES.filter((c) => c.toolCount > 0);

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-2 p-1">
        {categoriesWithTools.map((category) => {
          const tools = getToolsByCategory(category.id);
          const Icon: LucideIcon = ICON_MAP[category.icon] ?? Compass;
          const defaultOpen = category.id === initialCategory || categoriesWithTools.length <= 2;

          return (
            <CategoryGroup
              key={category.id}
              categoryName={category.name}
              icon={<Icon className="h-4 w-4" />}
              toolCount={tools.length}
              defaultOpen={defaultOpen}
            >
              {tools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => {
                    onSelectTool(tool);
                    onToolClick?.();
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    selectedTool?.name === tool.name
                      ? "bg-primary/20 text-primary border-l-2 border-primary font-medium pl-2.5"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground pl-3 border-l-2 border-transparent",
                  )}
                >
                  {tool.displayName}
                </button>
              ))}
            </CategoryGroup>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function CategoryGroup({
  categoryName,
  icon,
  toolCount,
  defaultOpen,
  children,
}: {
  categoryName: string;
  icon: React.ReactNode;
  toolCount: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-2">
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-white/5 transition-colors group">
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">{icon}</span>
          <span className="flex-1 text-left">{categoryName}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 min-w-[1.25rem] justify-center bg-black/20 border-white/10">
            {toolCount}
          </Badge>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pl-4 pt-1 animate-accordion-down">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function McpToolSidebar(props: McpToolSidebarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Mobile: Sheet trigger */}
      <div className="lg:hidden mb-4">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Menu className="h-4 w-4" />
                Browse Tools
              </span>
              <Badge variant="secondary" className="ml-auto">
                {props.selectedTool?.displayName || "Select a tool"}
              </Badge>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-6 border-b border-white/10">
              <SheetTitle>MCP Tools</SheetTitle>
            </SheetHeader>
            <div className="p-4 h-[calc(100vh-5rem)]">
              <SidebarContent
                {...props}
                onToolClick={() => setSheetOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Permanent sidebar */}
      <div className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24 h-[calc(100vh-6rem)] glass-1 glass-edge rounded-2xl p-4 overflow-hidden flex flex-col shadow-xl">
          <div className="mb-4 px-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Available Tools</h3>
          </div>
          <SidebarContent {...props} />
        </div>
      </div>
    </>
  );
}
