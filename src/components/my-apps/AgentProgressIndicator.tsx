"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Brain, CheckCircle, Database, Loader2, Wifi, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

export type AgentStage =
  | "connecting"
  | "fetching_context"
  | "processing"
  | "executing_tool"
  | "validating"
  | "complete"
  | "error";

export interface AgentProgressIndicatorProps {
  stage: AgentStage | null;
  currentTool?: string;
  errorMessage?: string;
  isVisible: boolean;
  startTime?: number;
  className?: string;
}

interface StageConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
  order: number;
}

const STAGE_CONFIG: Record<AgentStage, StageConfig> = {
  connecting: {
    label: "Connect",
    description: "Connecting to AI...",
    icon: <Wifi className="h-4 w-4" />,
    order: 0,
  },
  fetching_context: {
    label: "Context",
    description: "Fetching current code...",
    icon: <Database className="h-4 w-4" />,
    order: 1,
  },
  processing: {
    label: "Process",
    description: "Processing your request...",
    icon: <Brain className="h-4 w-4" />,
    order: 2,
  },
  executing_tool: {
    label: "Execute",
    description: "Executing tool...",
    icon: <Wrench className="h-4 w-4" />,
    order: 3,
  },
  validating: {
    label: "Validate",
    description: "Verifying changes...",
    icon: <CheckCircle className="h-4 w-4" />,
    order: 4,
  },
  complete: {
    label: "Complete",
    description: "Done!",
    icon: <CheckCircle className="h-4 w-4" />,
    order: 5,
  },
  error: {
    label: "Error",
    description: "An error occurred",
    icon: <AlertCircle className="h-4 w-4" />,
    order: -1,
  },
};

const SIMULATED_LOGS: Record<AgentStage, string[]> = {
  connecting: [
    "Resolving neuron endpoint...",
    "Handshaking with agent swarm...",
    "Verifying cryptographic signatures...",
    "Establishing secure websocket tunnel...",
  ],
  fetching_context: [
    "Scanning workspace file system...",
    "Parsing AST for context analysis...",
    "Resolving dependency graph...",
    "Loading simulation parameters...",
    "Vectorizing current codebase...",
  ],
  processing: [
    "Inferring user intent...",
    "Constructing execution plan...",
    "Optimizing step distribution...",
    "Allocating compute resources...",
    "Simulating potential outcomes...",
  ],
  executing_tool: [
    "Spawning subprocess...",
    "Writing diff to file system...",
    "Patching source files...",
    "Verifying syntax integrity...",
    "Waiting for I/O operation...",
  ],
  validating: [
    "Running static analysis...",
    "Compiling typescript definitions...",
    "Checking integration tests...",
    "Verifying build artifacts...",
    "Analyzing performance metrics...",
  ],
  complete: ["Operation completed successfully.", "All systems nominal."],
  error: ["Process interrupted.", "StackTrace dumped to console."],
};

const ORDERED_STAGES: AgentStage[] = [
  "connecting",
  "fetching_context",
  "processing",
  "executing_tool",
  "validating",
];

function formatElapsedTime(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

export function AgentProgressIndicator({
  stage,
  currentTool,
  errorMessage,
  isVisible,
  startTime,
  className = "",
}: AgentProgressIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [logMessage, setLogMessage] = useState("");

  const currentStageConfig = stage ? STAGE_CONFIG[stage] : STAGE_CONFIG.connecting;
  const currentOrder = currentStageConfig.order;

  // Target progress based on stage
  const targetProgress = !stage
    ? 0
    : stage === "complete"
    ? 100
    : stage === "error"
    ? 100
    : Math.min(((currentOrder + 1) / ORDERED_STAGES.length) * 100, 100);

  // Update elapsed time every 100ms
  useEffect(() => {
    if (!isVisible || !startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, startTime]);

  // Smooth progress simulation
  useEffect(() => {
    if (!isVisible) {
      setDisplayProgress(0);
      return;
    }

    // Jump to near the target, then creep
    const startProgress = currentOrder === 0
      ? 0
      : (currentOrder / ORDERED_STAGES.length) * 100;

    // If we moved backwards or just started, reset/snap
    if (displayProgress < startProgress || displayProgress > targetProgress) {
      setDisplayProgress(startProgress);
    }

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        // If we are at the target, stay there (unless complete/error which stays at 100)
        if (prev >= targetProgress) return targetProgress;

        // Creep speed: faster if far away, slower if close
        const distance = targetProgress - prev;
        const increment = Math.max(0.1, distance * 0.05);
        return Math.min(prev + increment, targetProgress - 2); // Stop just short of full target for this stage
      });
    }, 50);

    return () => clearInterval(interval);
    // Note: displayProgress is intentionally in dependencies to create smooth animation
    // by continuously re-running the interval until target is reached
  }, [isVisible, currentOrder, targetProgress, displayProgress]);

  // Log message cycling
  useEffect(() => {
    if (!stage || !isVisible) return;

    const logs = SIMULATED_LOGS[stage] || [STAGE_CONFIG[stage].description];
    let index = 0;

    setLogMessage(logs[0] ?? "");

    if (logs.length <= 1) return;

    const interval = setInterval(() => {
      index = (index + 1) % logs.length;
      setLogMessage(logs[index] ?? "");
    }, 2000);

    return () => clearInterval(interval);
  }, [stage, isVisible]);

  if (!isVisible || !stage) {
    return null;
  }

  const getDescription = () => {
    if (stage === "executing_tool" && currentTool) {
      return `Executing ${currentTool}...`;
    }
    if (stage === "error" && errorMessage) {
      return errorMessage;
    }
    return logMessage;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-4 ${className}`}
      >
        {/* Header with elapsed time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-teal-400 animate-spin" />
            <span className="text-sm font-medium text-zinc-200">
              Agent Working
            </span>
          </div>
          <span className="text-xs text-zinc-500 font-mono tabular-nums">
            {formatElapsedTime(elapsedTime)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
          <motion.div
            className={`h-full rounded-full ${
              stage === "error"
                ? "bg-red-500"
                : stage === "complete"
                ? "bg-green-500"
                : "bg-teal-500"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>

        {/* Stage indicators - Continuous Flow */}
        <div className="flex items-center w-full px-2 mb-4">
          {ORDERED_STAGES.map((s, index) => {
            const config = STAGE_CONFIG[s];
            const isCompleted = currentOrder > config.order;
            const isCurrent = stage === s;
            const isError = stage === "error";

            return (
              <div
                key={s}
                className={`flex items-center ${index < ORDERED_STAGES.length - 1 ? "flex-1" : ""}`}
              >
                {/* Stage circle */}
                <div
                  className={`
                    flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-300 z-10
                    ${
                    isError
                      ? "border-zinc-700 text-zinc-600 bg-zinc-900"
                      : isCompleted
                      ? "border-teal-500 bg-teal-500/20 text-teal-400"
                      : isCurrent
                      ? "border-teal-500 bg-teal-500/10 text-teal-400 ring-4 ring-teal-500/20"
                      : "border-zinc-700 text-zinc-600 bg-zinc-900"
                  }
                  `}
                >
                  {isCompleted
                    ? <CheckCircle className="h-4 w-4" />
                    : isCurrent
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <span className="text-xs font-medium">{index + 1}</span>}
                </div>

                {/* Connector line - Fills space between circles */}
                {index < ORDERED_STAGES.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 relative overflow-hidden bg-zinc-800 rounded-full">
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={isCompleted ? { x: 0 } : { x: "-100%" }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 bg-teal-500/50"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stage labels */}
        {/* Stage labels - Centered under circles */}
        <div className="flex justify-between text-[10px] text-zinc-500 mb-3 px-2">
          {ORDERED_STAGES.map((s, index) => {
            const config = STAGE_CONFIG[s];
            const isCompleted = currentOrder > config.order;
            const isCurrent = stage === s;

            return (
              <div
                key={s}
                className={`
                   ${
                  index === 0
                    ? "text-left"
                    : index === ORDERED_STAGES.length - 1
                    ? "text-right"
                    : "text-center"
                }
                   w-20 -ml-6 first:ml-0 last:-mr-6 last:ml-0
                   transition-colors duration-300
                `}
              >
                <span
                  className={`
                    ${
                    isCurrent
                      ? "text-teal-400 font-medium"
                      : isCompleted
                      ? "text-zinc-400"
                      : "text-zinc-600"
                  }
                  `}
                >
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current status */}
        <div
          className={`
          flex items-center gap-2 text-sm
          ${stage === "error" ? "text-red-400" : "text-zinc-300"}
        `}
        >
          {currentStageConfig.icon}
          <span className="font-mono text-xs">{getDescription()}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
