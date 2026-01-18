/**
 * App Factory Types
 *
 * Types for the Jules App Factory Dashboard that monitors apps
 * moving through the development pipeline.
 */

/**
 * Pipeline phases for app development
 * Apps progress: plan → develop → test → debug → polish → complete
 */
export type AppPhase =
  | "plan"
  | "develop"
  | "test"
  | "debug"
  | "polish"
  | "complete";

/**
 * All possible phases including backlog
 */
export type AppPhaseWithBacklog = AppPhase | "backlog";

/**
 * Current state of an app in the pipeline
 */
export interface AppState {
  name: string;
  category: string;
  phase: AppPhase;
  attempts: number;
  lastError?: string | null;
  liveUrl?: string;
  createdAt: string;
  updatedAt: string;
  priority?: number;
  /** Active Jules session ID working on this app */
  julesSessionId?: string;
  /** URL to the active Jules session */
  julesSessionUrl?: string;
  /** Current Jules session state */
  julesSessionState?: string;
}

/**
 * History entry for state transitions
 * Stored as JSON lines in history/{app-name}.log
 */
export interface HistoryEntry {
  timestamp: string;
  appName: string;
  event:
    | "initialized"
    | "phase_complete"
    | "phase_failed"
    | "manual_move"
    | "jules_started"
    | "jules_completed"
    | "jules_failed";
  from?: AppPhase;
  to?: AppPhase;
  reason?: string;
  /** Jules session ID associated with this event */
  julesSessionId?: string;
}

/**
 * Statistics calculated from current state and history
 */
export interface AppFactoryStatistics {
  phaseCount: Record<AppPhase, number>;
  avgTimePerPhase: Record<AppPhase, number>;
  completedToday: number;
  completedThisHour: number;
  failedAttempts: number;
  totalApps: number;
  inProgressApps: number;
}

/**
 * Item from the master list of app ideas
 */
export interface MasterListItem {
  name: string;
  category: string;
  description: string;
}

/**
 * Jules session from the API
 */
export interface JulesSession {
  id: string;
  title: string;
  state: string;
  source: string;
  url: string;
  createTime: string;
  updateTime: string;
}

/**
 * Jules agent capacity information
 */
export interface JulesCapacity {
  totalSlots: number;
  freeAgents: number;
  wipThisProject: number;
  wipElsewhere: number;
  activeSessions: JulesSession[];
}

/**
 * Full dashboard data returned by the API
 */
export interface AppFactoryDashboardData {
  apps: AppState[];
  statistics: AppFactoryStatistics;
  recentActivity: HistoryEntry[];
  masterList: MasterListItem[];
  julesCapacity: JulesCapacity;
  timestamp: string;
}

/**
 * Request body for adding an app to the pipeline
 */
export interface AddAppRequest {
  name: string;
  category: string;
  description?: string;
}

/**
 * Request body for moving an app to a different phase
 */
export interface MoveAppRequest {
  appName: string;
  toPhase: AppPhase;
  reason?: string;
}

/**
 * Request body for reordering backlog
 */
export interface ReorderBacklogRequest {
  order: string[];
}

/**
 * Phase display configuration
 */
export const PHASE_CONFIG: Record<
  AppPhase,
  { label: string; color: string; bgColor: string; emoji: string; }
> = {
  plan: {
    label: "Plan",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    emoji: "📋",
  },
  develop: {
    label: "Develop",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    emoji: "💻",
  },
  test: {
    label: "Test",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    emoji: "🧪",
  },
  debug: {
    label: "Debug",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    emoji: "🔧",
  },
  polish: {
    label: "Polish",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    emoji: "✨",
  },
  complete: {
    label: "Complete",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    emoji: "✅",
  },
};

/**
 * Ordered list of phases for iteration
 */
export const PHASES_ORDERED: AppPhase[] = [
  "plan",
  "develop",
  "test",
  "debug",
  "polish",
  "complete",
];

/**
 * Status colors based on attempt count
 */
export function getStatusColor(attempts: number): {
  border: string;
  bg: string;
} {
  if (attempts >= 3) {
    return {
      border: "border-red-500",
      bg: "bg-red-50 dark:bg-red-900/30",
    };
  }
  if (attempts >= 1) {
    return {
      border: "border-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/30",
    };
  }
  return {
    border: "border-border",
    bg: "",
  };
}
