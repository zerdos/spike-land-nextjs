/**
 * Jules Capacity Panel
 *
 * Shows the current Jules agent capacity:
 * - Free agents available
 * - WIP on this project
 * - WIP elsewhere
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type JulesCapacity, THIS_PROJECT_SOURCE } from "@/types/app-factory";
import { Bot, ExternalLink } from "lucide-react";

interface JulesCapacityPanelProps {
  capacity: JulesCapacity;
}

export function JulesCapacityPanel({ capacity }: JulesCapacityPanelProps) {
  const { totalSlots, freeAgents, wipThisProject, wipElsewhere, activeSessions } = capacity;

  // Calculate percentages for the visual bar
  const freePercent = (freeAgents / totalSlots) * 100;
  const thisProjectPercent = (wipThisProject / totalSlots) * 100;
  const elsewherePercent = (wipElsewhere / totalSlots) * 100;

  // Sessions for this project
  const thisProjectSessions = activeSessions.filter(
    (s) => s.source === THIS_PROJECT_SOURCE,
  );
  const otherSessions = activeSessions.filter(
    (s) => s.source !== THIS_PROJECT_SOURCE,
  );

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bot className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Jules Agent Capacity</span>
          <Badge variant="outline" className="ml-auto">
            {totalSlots} slots
          </Badge>
        </div>

        {/* Visual capacity bar */}
        <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className="flex h-full">
            {/* Free agents (green) */}
            {freePercent > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${freePercent}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{freeAgents} free agent(s)</p>
                </TooltipContent>
              </Tooltip>
            )}
            {/* This project (blue) */}
            {thisProjectPercent > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${thisProjectPercent}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{wipThisProject} on this project</p>
                </TooltipContent>
              </Tooltip>
            )}
            {/* Elsewhere (amber) */}
            {elsewherePercent > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${elsewherePercent}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{wipElsewhere} on other projects</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Free:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {freeAgents} agent{freeAgents !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">This project:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {wipThisProject} agent{wipThisProject !== 1 ? "s" : ""}
            </span>
          </div>

          {wipElsewhere > 0 && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Elsewhere:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {wipElsewhere} agent{wipElsewhere !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Active sessions list */}
        {activeSessions.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Active Sessions
            </p>
            <div className="space-y-1">
              {thisProjectSessions.map((session) => (
                <a
                  key={session.id}
                  href={session.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted"
                >
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="flex-1 truncate">{session.title}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {session.state}
                  </Badge>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
              {otherSessions.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  + {otherSessions.length} session{otherSessions.length !== 1 ? "s" : ""}{" "}
                  on other projects
                </div>
              )}
            </div>
          </div>
        )}

        {activeSessions.length === 0 && (
          <div className="mt-3 text-center text-xs text-muted-foreground">
            No active Jules sessions
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
