"use client";

import type { SwarmAgent } from "@/lib/admin/swarm/types";
import { spawnAgent, stopAgent } from "@/lib/admin/swarm/actions/agent-actions";
import { SwarmSidebar } from "../layout/SwarmSidebar";
import { SwarmTopBar } from "../layout/SwarmTopBar";
import { AgentGrid } from "./AgentGrid";
import { SpawnAgentDialog } from "./SpawnAgentDialog";

const PLACEHOLDER_AGENTS: SwarmAgent[] = [
  {
    id: "agent-1",
    displayName: "build-agent",
    status: "active",
    machineId: "mac-studio-1",
    sessionId: "sess-abc12345",
    projectPath: "/Users/z/Developer/spike-land-nextjs",
    workingDirectory: "/Users/z/Developer/spike-land-nextjs",
    lastSeenAt: new Date(Date.now() - 120_000),
    totalTokensUsed: 45_000,
    totalTasksCompleted: 8,
    totalSessionTime: 3600,
    messageCount: 24,
    createdAt: new Date(Date.now() - 7_200_000),
  },
  {
    id: "agent-2",
    displayName: "test-runner",
    status: "idle",
    machineId: "mac-studio-1",
    sessionId: "sess-def67890",
    projectPath: "/Users/z/Developer/spike-land-nextjs",
    workingDirectory: "/Users/z/Developer/spike-land-nextjs",
    lastSeenAt: new Date(Date.now() - 300_000),
    totalTokensUsed: 12_000,
    totalTasksCompleted: 3,
    totalSessionTime: 1800,
    messageCount: 10,
    createdAt: new Date(Date.now() - 5_400_000),
  },
  {
    id: "agent-3",
    displayName: "deploy-bot",
    status: "active",
    machineId: "mac-studio-2",
    sessionId: "sess-ghi11223",
    projectPath: null,
    workingDirectory: null,
    lastSeenAt: new Date(),
    totalTokensUsed: 8_000,
    totalTasksCompleted: 2,
    totalSessionTime: 900,
    messageCount: 6,
    createdAt: new Date(Date.now() - 1_800_000),
  },
];

async function handleSpawn(formData: FormData) {
  await spawnAgent(formData);
}

async function handleStop(agentId: string) {
  await stopAgent(agentId);
}

export function AgentCommandCenter() {
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-8">
      <SwarmSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SwarmTopBar />
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Agent Command Center</h2>
              <p className="text-sm text-muted-foreground">
                Manage Claude Code agent instances.
              </p>
            </div>
            <SpawnAgentDialog onSpawn={handleSpawn} />
          </div>
          <AgentGrid agents={PLACEHOLDER_AGENTS} onStopAgent={handleStop} />
        </div>
      </div>
    </div>
  );
}
