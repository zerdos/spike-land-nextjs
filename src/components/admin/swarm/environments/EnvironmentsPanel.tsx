"use client";

import type { EnvironmentInfo } from "@/lib/admin/swarm/types";
import { SwarmSidebar } from "../layout/SwarmSidebar";
import { SwarmTopBar } from "../layout/SwarmTopBar";
import { EnvironmentCard } from "./EnvironmentCard";

const PLACEHOLDER_ENVIRONMENTS: EnvironmentInfo[] = [
  {
    name: "dev",
    url: "https://dev.spike.land",
    healthEndpoint: "/api/health",
    status: "healthy",
    lastDeployedAt: new Date(Date.now() - 600_000),
    commitSha: "abc1234def5678",
    version: "0.1.0",
  },
  {
    name: "preview",
    url: "https://preview.spike.land",
    healthEndpoint: "/api/health",
    status: "deploying",
    lastDeployedAt: new Date(Date.now() - 120_000),
    commitSha: "def5678abc1234",
    version: "0.1.1-preview",
  },
  {
    name: "prod",
    url: "https://spike.land",
    healthEndpoint: "/api/health",
    status: "healthy",
    lastDeployedAt: new Date(Date.now() - 10_800_000),
    commitSha: "789abc123def45",
    version: "0.1.0",
  },
];

function handleDeploy(env: EnvironmentInfo) {
  // Placeholder: will call server action
  console.log("Deploy to", env.name);
}

function handleRollback(env: EnvironmentInfo) {
  // Placeholder: will call server action
  console.log("Rollback", env.name);
}

export function EnvironmentsPanel() {
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-8">
      <SwarmSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SwarmTopBar />
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Environments</h2>
            <p className="text-sm text-muted-foreground">
              Monitor and manage deployment environments.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PLACEHOLDER_ENVIRONMENTS.map((env) => (
              <EnvironmentCard
                key={env.name}
                env={env}
                onDeploy={handleDeploy}
                onRollback={handleRollback}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
