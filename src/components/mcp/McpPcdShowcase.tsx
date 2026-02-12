"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion, useInView } from "framer-motion";
import { Check, Plug, Search, Zap } from "lucide-react";
import { useRef } from "react";

const GATEWAY_TOOLS = [
  "search_tools",
  "list_categories",
  "enable_category",
  "get_balance",
  "get_status",
];

const DISCOVERED_TOOLS = [
  "generate_image",
  "modify_image",
  "check_job",
];

const ACTIVATED_TOOLS = [
  ...GATEWAY_TOOLS,
  ...DISCOVERED_TOOLS,
  "codespace_update",
  "codespace_run",
  "codespace_screenshot",
  "codespace_get",
  "codespace_link_app",
  "codespace_list_my_apps",
  "jules_list_sessions",
  "jules_create_session",
  "jules_get_session",
  "jules_approve_plan",
  "jules_send_message",
  "bridgemind_list_tasks",
  "bridgemind_create_task",
  "bridgemind_update_task",
  "bridgemind_get_knowledge",
  "bridgemind_add_knowledge",
  "bridgemind_list_sprints",
  "github_list_issues",
  "github_create_issue",
  "github_get_pr_status",
  "sync_bridgemind_to_github",
  "sync_status",
  "bolt_status",
  "bolt_pause",
  "bolt_resume",
];

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  tools: string[];
  badgeLabel: string;
  badgeVariant: "default" | "secondary" | "success";
}

const steps: Step[] = [
  {
    number: 1,
    title: "Connect",
    description:
      "Agent connects to spike.land MCP. Only 5 lightweight gateway tools are exposed — no context bloat.",
    icon: <Plug className="w-5 h-5" />,
    tools: GATEWAY_TOOLS,
    badgeLabel: "5 tools",
    badgeVariant: "default",
  },
  {
    number: 2,
    title: "Discover",
    description:
      'Agent calls search_tools("image"). The gateway finds matching tools and returns them on demand.',
    icon: <Search className="w-5 h-5" />,
    tools: [...GATEWAY_TOOLS, ...DISCOVERED_TOOLS],
    badgeLabel: "8 tools",
    badgeVariant: "secondary",
  },
  {
    number: 3,
    title: "Activate",
    description:
      "Agent enables categories as needed. Full toolset available — loaded only when required.",
    icon: <Zap className="w-5 h-5" />,
    tools: ACTIVATED_TOOLS,
    badgeLabel: `${ACTIVATED_TOOLS.length} tools`,
    badgeVariant: "success",
  },
];

function ToolList({
  tools,
  showCheck,
  maxVisible,
}: {
  tools: string[];
  showCheck: boolean;
  maxVisible: number;
}) {
  const visible = tools.slice(0, maxVisible);
  const remaining = tools.length - maxVisible;

  return (
    <div className="space-y-1.5">
      {visible.map((tool) => (
        <div
          key={tool}
          className="flex items-center gap-2 text-xs text-muted-foreground font-mono"
        >
          {showCheck ? (
            <Check className="w-3 h-3 text-aurora-green shrink-0" />
          ) : (
            <span className="w-3 h-3 rounded-full border border-white/20 shrink-0" />
          )}
          <span className="truncate">{tool}</span>
        </div>
      ))}
      {remaining > 0 && (
        <div className="text-xs text-muted-foreground/60 pl-5">
          +{remaining} more...
        </div>
      )}
    </div>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.5, delay: index * 0.2, ease: "easeOut" }}
      className="flex flex-col items-center"
    >
      {/* Step number circle */}
      <div className="relative mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
          <span className="text-lg font-bold text-white">
            {step.number}
          </span>
        </div>
        <div className="absolute -inset-2 rounded-full bg-cyan-500/10 blur-lg -z-10" />
      </div>

      <Card variant="default" className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              {step.icon}
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </div>
            <Badge variant={step.badgeVariant}>{step.badgeLabel}</Badge>
          </div>
          <CardDescription className="text-sm leading-relaxed">
            {step.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToolList
            tools={step.tools}
            showCheck={step.number === 3}
            maxVisible={step.number === 3 ? 6 : step.tools.length}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function McpPcdShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent pointer-events-none" />

      <div className="container relative mx-auto px-4">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Progressive Context Disclosure keeps your agent fast and focused.
            Tools load only when needed.
          </p>
        </motion.div>

        {/* Steps grid with connecting lines */}
        <div className="relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-6 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            {steps.map((step, i) => (
              <StepCard key={step.number} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
