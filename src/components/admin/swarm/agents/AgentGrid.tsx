"use client";

import type { SwarmAgent } from "@/lib/admin/swarm/types";
import { Bot } from "lucide-react";
import { EmptyState } from "../shared/EmptyState";
import { AgentCard } from "./AgentCard";

interface AgentGridProps {
  agents: SwarmAgent[];
  onStopAgent?: (agentId: string) => void;
}

export function AgentGrid({ agents, onStopAgent }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No agents running"
        description="Spawn a new agent to get started."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onStop={onStopAgent} />
      ))}
    </div>
  );
}
