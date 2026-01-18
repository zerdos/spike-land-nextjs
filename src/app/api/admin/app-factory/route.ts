/**
 * App Factory Dashboard API
 *
 * GET - Returns dashboard data including apps, statistics, and activity
 * POST - Move an app to a different phase (manual intervention)
 */

import { auth } from "@/auth";
import {
  isValidAppName,
  loadRecentHistory,
  loadState,
  logHistory,
  saveState,
} from "@/lib/app-factory/storage";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { tryCatch } from "@/lib/try-catch";
import type {
  AddAppRequest,
  AppFactoryDashboardData,
  AppFactoryStatistics,
  AppPhase,
  AppState,
  HistoryEntry,
  JulesCapacity,
  JulesSession,
  MasterListItem,
  MoveAppRequest,
} from "@/types/app-factory";
import { PHASES_ORDERED, THIS_PROJECT_SOURCE } from "@/types/app-factory";
import { type NextRequest, NextResponse } from "next/server";

// Jules API configuration
const JULES_API_KEY = process.env["JULES_API_KEY"] || "";
const JULES_API_BASE = "https://jules.googleapis.com/v1alpha";
const JULES_TOTAL_SLOTS = 15; // Pro plan concurrent session limit

// Active session states (not completed/failed/cancelled)
const ACTIVE_STATES = ["PENDING", "PLANNING", "IN_PROGRESS", "WAITING_FOR_USER"];

// Completed session states
const COMPLETED_STATES = ["COMPLETED"];
const FAILED_STATES = ["FAILED", "CANCELLED"];

/**
 * In-memory lock to prevent concurrent processing of the same app
 * This prevents race conditions where multiple polling requests try to advance the same app
 *
 * NOTE: This only works within a single process. In serverless environments (Vercel),
 * this won't prevent concurrent processing across different instances. For production
 * use with high concurrency, consider Redis-based locking or database transactions.
 */
const processingApps = new Set<string>();

/**
 * Phase-specific prompts for Jules sessions
 */
const PHASE_PROMPTS: Record<AppPhase, (app: AppState, description?: string) => string> = {
  plan: (app, description) =>
    `
Create a detailed implementation plan for the "${app.name}" app (category: ${app.category}).

${description ? `Description: ${description}` : ""}

Please create a file at apps/${app.category}/${app.name}.plan.md with:
1. App overview and core features
2. Technical requirements (React, TypeScript, Tailwind CSS)
3. Component structure
4. State management approach
5. Step-by-step implementation tasks
6. Testing strategy

This is a simple, single-page React app for spike.land. Keep it focused and achievable.
`.trim(),

  develop: (app) =>
    `
Implement the "${app.name}" app based on the plan at apps/${app.category}/${app.name}.plan.md

Create the app at apps/${app.category}/${app.name}/index.tsx

Requirements:
- Single React component with TypeScript
- Use Tailwind CSS for styling
- Include all necessary state management
- Make it fully functional
- Add helpful comments

After implementation, the app should be ready for testing.
`.trim(),

  test: (app) =>
    `
Test the "${app.name}" app at apps/${app.category}/${app.name}/index.tsx

1. Review the code for any obvious issues
2. Create a test file at apps/${app.category}/${app.name}/index.test.tsx
3. Write unit tests for core functionality
4. Verify TypeScript types are correct
5. Check for accessibility issues
6. Document any bugs found in the plan file

If tests pass, mark it ready for the next phase. If issues found, document them.
`.trim(),

  debug: (app) =>
    `
Debug and fix issues in the "${app.name}" app at apps/${app.category}/${app.name}/index.tsx

${app.lastError ? `Last error: ${app.lastError}` : ""}

1. Review any failing tests
2. Fix TypeScript errors
3. Fix runtime bugs
4. Ensure all functionality works as expected
5. Update tests if needed

The app should work correctly after this phase.
`.trim(),

  polish: (app) =>
    `
Polish the "${app.name}" app at apps/${app.category}/${app.name}/index.tsx

1. Improve UI/UX with better styling
2. Add loading states and error handling
3. Ensure responsive design
4. Add keyboard accessibility
5. Optimize performance if needed
6. Add any finishing touches

Make it production-ready and delightful to use.
`.trim(),

  complete: () => `This app is already complete. No action needed.`,
};

interface JulesApiSession {
  id: string;
  name: string;
  title?: string;
  state: string;
  sourceContext?: {
    source?: string;
  };
  url?: string;
  createTime?: string;
  updateTime?: string;
}

interface JulesApiResponse {
  sessions?: JulesApiSession[];
}

/**
 * Fetch Jules sessions and calculate capacity
 */
async function fetchJulesCapacity(): Promise<JulesCapacity> {
  const defaultCapacity: JulesCapacity = {
    totalSlots: JULES_TOTAL_SLOTS,
    freeAgents: JULES_TOTAL_SLOTS,
    wipThisProject: 0,
    wipElsewhere: 0,
    activeSessions: [],
  };

  if (!JULES_API_KEY) {
    return defaultCapacity;
  }

  try {
    const response = await fetch(`${JULES_API_BASE}/sessions`, {
      headers: {
        "X-Goog-Api-Key": JULES_API_KEY,
      },
      // Cache for 5 seconds to avoid rate limiting
      next: { revalidate: 5 },
    });

    if (!response.ok) {
      console.error("Jules API error:", response.status);
      return defaultCapacity;
    }

    const data: JulesApiResponse = await response.json();
    const sessions = data.sessions || [];

    // Filter active sessions
    const activeSessions = sessions.filter((s) => ACTIVE_STATES.includes(s.state));

    // Count WIP for this project vs elsewhere
    let wipThisProject = 0;
    let wipElsewhere = 0;
    const activeSessionDetails: JulesSession[] = [];

    for (const session of activeSessions) {
      const source = session.sourceContext?.source || "";
      const isThisProject = source === THIS_PROJECT_SOURCE;

      if (isThisProject) {
        wipThisProject++;
      } else {
        wipElsewhere++;
      }

      activeSessionDetails.push({
        id: session.id,
        title: session.title || "Untitled",
        state: session.state,
        source: source,
        url: session.url || `https://jules.google.com/session/${session.id}`,
        createTime: session.createTime || "",
        updateTime: session.updateTime || "",
      });
    }

    const freeAgents = JULES_TOTAL_SLOTS - wipThisProject - wipElsewhere;

    return {
      totalSlots: JULES_TOTAL_SLOTS,
      freeAgents: Math.max(0, freeAgents),
      wipThisProject,
      wipElsewhere,
      activeSessions: activeSessionDetails,
    };
  } catch (error) {
    console.error("Failed to fetch Jules capacity:", error);
    return defaultCapacity;
  }
}

interface CreateSessionResult {
  success: boolean;
  sessionId?: string;
  sessionUrl?: string;
  error?: string;
}

/**
 * Create a new Jules session for an app at a specific phase
 * Prevents duplicate sessions by checking if app already has an active session
 */
async function createJulesSession(
  app: AppState,
  phase: AppPhase,
  description?: string,
): Promise<CreateSessionResult> {
  if (!JULES_API_KEY) {
    return { success: false, error: "Jules API key not configured" };
  }

  if (phase === "complete") {
    return { success: false, error: "Cannot create session for complete phase" };
  }

  // GUARD: Skip if app already has an active session
  if (app.julesSessionId && app.julesSessionState) {
    const isActive = ACTIVE_STATES.includes(app.julesSessionState);
    if (isActive) {
      console.log(
        `Skipping session creation for ${app.name} - already has active session ${app.julesSessionId}`,
      );
      return { success: false, error: "App already has active session" };
    }
  }

  const prompt = PHASE_PROMPTS[phase](app, description);

  try {
    const response = await fetch(`${JULES_API_BASE}/sessions`, {
      method: "POST",
      headers: {
        "X-Goog-Api-Key": JULES_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        sourceContext: {
          source: THIS_PROJECT_SOURCE,
          githubRepoContext: {
            startingBranch: "main",
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Jules session creation failed:", response.status, errorText);
      return { success: false, error: `Jules API error: ${response.status}` };
    }

    const session: JulesApiSession = await response.json();

    return {
      success: true,
      sessionId: session.id,
      sessionUrl: `https://jules.google.com/session/${session.id}`,
    };
  } catch (error) {
    console.error("Failed to create Jules session:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get the status of a Jules session
 */
async function getJulesSessionStatus(sessionId: string): Promise<
  {
    state: string;
    isActive: boolean;
    isCompleted: boolean;
    isFailed: boolean;
  } | null
> {
  if (!JULES_API_KEY || !sessionId) {
    return null;
  }

  try {
    const response = await fetch(`${JULES_API_BASE}/sessions/${sessionId}`, {
      headers: {
        "X-Goog-Api-Key": JULES_API_KEY,
      },
    });

    if (!response.ok) {
      return null;
    }

    const session: JulesApiSession = await response.json();

    return {
      state: session.state,
      isActive: ACTIVE_STATES.includes(session.state),
      isCompleted: COMPLETED_STATES.includes(session.state),
      isFailed: FAILED_STATES.includes(session.state),
    };
  } catch {
    return null;
  }
}

/**
 * Get the next phase in the pipeline
 */
function getNextPhase(currentPhase: AppPhase): AppPhase | null {
  const index = PHASES_ORDERED.indexOf(currentPhase);
  if (index === -1 || index >= PHASES_ORDERED.length - 1) {
    return null;
  }
  return PHASES_ORDERED[index + 1] ?? null;
}

/**
 * Master list of app ideas from the app factory orchestrate.ts
 */
const MASTER_LIST: MasterListItem[] = [
  // Utility Tools
  {
    name: "pomodoro-timer",
    category: "utility",
    description: "Customizable work/break intervals with sounds",
  },
  {
    name: "unit-converter",
    category: "utility",
    description: "Length, weight, temperature, volume conversions",
  },
  {
    name: "color-picker",
    category: "utility",
    description: "HSL/RGB/Hex picker with palette generation",
  },
  {
    name: "qr-code-generator",
    category: "utility",
    description: "Text/URL to QR code with download",
  },
  {
    name: "password-generator",
    category: "utility",
    description: "Configurable secure password creation",
  },
  {
    name: "json-formatter",
    category: "utility",
    description: "Prettify/minify JSON with syntax highlighting",
  },
  {
    name: "base64-encoder",
    category: "utility",
    description: "Encode/decode text and files",
  },
  {
    name: "lorem-ipsum-generator",
    category: "utility",
    description: "Configurable placeholder text",
  },
  {
    name: "countdown-timer",
    category: "utility",
    description: "Event countdown with shareable links",
  },
  { name: "stopwatch", category: "utility", description: "Lap times, history, export" },
  {
    name: "calculator",
    category: "utility",
    description: "Scientific calculator with history",
  },
  {
    name: "percentage-calculator",
    category: "utility",
    description: "Tip, discount, markup calculations",
  },
  {
    name: "age-calculator",
    category: "utility",
    description: "Birthday to exact age converter",
  },
  {
    name: "bmi-calculator",
    category: "utility",
    description: "With visual health range indicator",
  },
  {
    name: "mortgage-calculator",
    category: "utility",
    description: "Monthly payments with amortization chart",
  },
  {
    name: "currency-converter",
    category: "utility",
    description: "Live rates (mock data for demo)",
  },
  {
    name: "text-diff-tool",
    category: "utility",
    description: "Compare two texts side-by-side",
  },
  {
    name: "markdown-previewer",
    category: "utility",
    description: "Live markdown to HTML preview",
  },
  {
    name: "regex-tester",
    category: "utility",
    description: "Pattern testing with match highlighting",
  },
  {
    name: "gradient-generator",
    category: "utility",
    description: "CSS gradient builder with presets",
  },

  // Data Visualization
  {
    name: "daily-mood-tracker",
    category: "visualization",
    description: "Emoji-based mood logging with trend chart",
  },
  {
    name: "habit-streak-tracker",
    category: "visualization",
    description: "GitHub-style contribution graph",
  },
  {
    name: "expense-pie-chart",
    category: "visualization",
    description: "Category breakdown visualization",
  },
  {
    name: "fitness-progress",
    category: "visualization",
    description: "Weight/measurements over time",
  },
  {
    name: "sleep-quality-chart",
    category: "visualization",
    description: "Sleep duration and quality trends",
  },
  {
    name: "water-intake-tracker",
    category: "visualization",
    description: "Daily hydration with progress ring",
  },
  {
    name: "reading-goal-tracker",
    category: "visualization",
    description: "Books/pages with yearly progress",
  },
  {
    name: "savings-goal-meter",
    category: "visualization",
    description: "Visual progress toward financial goals",
  },
  {
    name: "workout-stats-dashboard",
    category: "visualization",
    description: "Exercise frequency and volume",
  },
  {
    name: "productivity-heatmap",
    category: "visualization",
    description: "Daily focus time visualization",
  },

  // Productivity Apps
  {
    name: "todo-list-classic",
    category: "productivity",
    description: "Add, complete, filter tasks",
  },
  {
    name: "daily-planner",
    category: "productivity",
    description: "Time-blocked schedule",
  },
  {
    name: "weekly-goals",
    category: "productivity",
    description: "Goal setting with progress tracking",
  },
  {
    name: "note-taking-app",
    category: "productivity",
    description: "Simple notes with local storage",
  },
  {
    name: "bookmark-manager",
    category: "productivity",
    description: "Save and organize links",
  },
  {
    name: "flashcard-study",
    category: "productivity",
    description: "Spaced repetition cards",
  },
  {
    name: "meeting-timer",
    category: "productivity",
    description: "Keep meetings on track",
  },
  {
    name: "decision-maker",
    category: "productivity",
    description: "Random choice from options",
  },
  {
    name: "priority-matrix",
    category: "productivity",
    description: "Eisenhower box task sorter",
  },
  {
    name: "focus-mode",
    category: "productivity",
    description: "Distraction blocker countdown",
  },

  // Interactive
  { name: "memory-game", category: "interactive", description: "Card matching with levels" },
  {
    name: "typing-speed-test",
    category: "interactive",
    description: "WPM with accuracy tracking",
  },
  {
    name: "reaction-time-test",
    category: "interactive",
    description: "Click speed measurement",
  },
  {
    name: "trivia-quiz",
    category: "interactive",
    description: "Multiple categories with scoring",
  },
  { name: "wordle-clone", category: "interactive", description: "Word guessing game" },
  {
    name: "tic-tac-toe",
    category: "interactive",
    description: "Classic game with AI opponent",
  },
  {
    name: "rock-paper-scissors",
    category: "interactive",
    description: "Animated game vs computer",
  },
  {
    name: "simon-says",
    category: "interactive",
    description: "Memory pattern game with sounds",
  },

  // Health
  {
    name: "medication-reminder",
    category: "health",
    description: "Schedule and track pills",
  },
  { name: "calorie-counter", category: "health", description: "Daily intake tracker" },
  { name: "workout-timer", category: "health", description: "HIIT/Tabata intervals" },
  {
    name: "meditation-timer",
    category: "health",
    description: "Guided session with bells",
  },
  {
    name: "breathing-exercise",
    category: "health",
    description: "Box breathing animation",
  },
  {
    name: "fasting-timer",
    category: "health",
    description: "Intermittent fasting tracker",
  },

  // Dogs
  {
    name: "dog-weight-tracker",
    category: "dogs",
    description: "Weight history with chart",
  },
  {
    name: "puppy-age-calculator",
    category: "dogs",
    description: "Human years equivalent",
  },
  {
    name: "dog-food-calculator",
    category: "dogs",
    description: "Portion sizes by weight",
  },
  {
    name: "vet-appointment-tracker",
    category: "dogs",
    description: "Vaccination schedule",
  },
  {
    name: "dog-walk-logger",
    category: "dogs",
    description: "Duration and distance tracking",
  },
  {
    name: "training-progress",
    category: "dogs",
    description: "Command mastery tracker",
  },
  {
    name: "breed-identifier-quiz",
    category: "dogs",
    description: "Guess the breed game",
  },
  {
    name: "dog-name-generator",
    category: "dogs",
    description: "Name suggestions by style",
  },
];

/**
 * Calculate statistics from apps and history
 */
function calculateStatistics(
  apps: AppState[],
  history: HistoryEntry[],
): AppFactoryStatistics {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Phase counts
  const phaseCount: Record<AppPhase, number> = {
    plan: 0,
    develop: 0,
    test: 0,
    debug: 0,
    polish: 0,
    complete: 0,
  };
  for (const app of apps) {
    phaseCount[app.phase]++;
  }

  // Calculate average time per phase from history
  const phaseTimes: Record<AppPhase, number[]> = {
    plan: [],
    develop: [],
    test: [],
    debug: [],
    polish: [],
    complete: [],
  };

  // Group history by app
  const appHistory: Record<string, HistoryEntry[]> = {};
  for (const entry of history) {
    const existing = appHistory[entry.appName];
    if (existing) {
      existing.push(entry);
    } else {
      appHistory[entry.appName] = [entry];
    }
  }

  // Calculate time spent in each phase
  for (const [, entries] of Object.entries(appHistory)) {
    const sorted = entries.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev && curr && prev.to && curr.from === prev.to) {
        const duration = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        phaseTimes[prev.to].push(duration);
      }
    }
  }

  const avgTimePerPhase: Record<AppPhase, number> = {
    plan: 0,
    develop: 0,
    test: 0,
    debug: 0,
    polish: 0,
    complete: 0,
  };

  for (const phase of PHASES_ORDERED) {
    const times = phaseTimes[phase];
    if (times.length > 0) {
      avgTimePerPhase[phase] = Math.round(
        times.reduce((sum, t) => sum + t, 0) / times.length,
      );
    }
  }

  // Count completions today and this hour
  const completedToday = history.filter(
    (e) =>
      e.event === "phase_complete" &&
      e.to === "complete" &&
      new Date(e.timestamp) >= todayStart,
  ).length;

  const completedThisHour = history.filter(
    (e) =>
      e.event === "phase_complete" &&
      e.to === "complete" &&
      new Date(e.timestamp) >= hourAgo,
  ).length;

  // Count failed attempts
  const failedAttempts = history.filter((e) => e.event === "phase_failed").length;

  return {
    phaseCount,
    avgTimePerPhase,
    completedToday,
    completedThisHour,
    failedAttempts,
    totalApps: apps.length,
    inProgressApps: apps.filter((a) => a.phase !== "complete").length,
  };
}

/**
 * Check all apps with active Jules sessions and auto-advance if completed
 * Uses in-memory locks to prevent race conditions with concurrent requests
 */
async function checkAndAdvanceJulesSessions(): Promise<void> {
  const state = await loadState();
  if (!state) return;

  let modified = false;

  for (const app of Object.values(state.apps)) {
    if (!app.julesSessionId) continue;

    // LOCK: Skip if app is already being processed by another request
    if (processingApps.has(app.name)) {
      console.log(`Skipping ${app.name} - already being processed`);
      continue;
    }

    const status = await getJulesSessionStatus(app.julesSessionId);
    if (!status) continue;

    // Update session state
    if (app.julesSessionState !== status.state) {
      app.julesSessionState = status.state;
      modified = true;
    }

    // If session completed, advance to next phase
    if (status.isCompleted) {
      // Acquire lock before processing
      processingApps.add(app.name);

      try {
        // Re-read state to get fresh data (another request may have already processed)
        const freshState = await loadState();
        const freshApp = freshState?.apps[app.name];

        // Check if already advanced by another request
        if (freshApp && freshApp.julesSessionId !== app.julesSessionId) {
          console.log(`Skipping ${app.name} - already advanced by another request`);
          continue;
        }

        const nextPhase = getNextPhase(app.phase);

        await logHistory(app.name, "jules_completed", {
          from: app.phase,
          to: nextPhase || app.phase,
          reason: `Jules completed ${app.phase}`,
          julesSessionId: app.julesSessionId,
        });

        if (nextPhase) {
          await logHistory(app.name, "phase_complete", {
            from: app.phase,
            to: nextPhase,
            reason: `Auto-advanced after Jules completed ${app.phase}`,
          });

          app.phase = nextPhase;
          app.updatedAt = new Date().toISOString();

          // Start new session for next phase (unless complete)
          if (nextPhase !== "complete") {
            const result = await createJulesSession(app, nextPhase);
            if (result.success && result.sessionId) {
              app.julesSessionId = result.sessionId;
              app.julesSessionUrl = result.sessionUrl;
              app.julesSessionState = "PENDING";

              await logHistory(app.name, "jules_started", {
                to: nextPhase,
                reason: `Auto-started Jules session for ${nextPhase}`,
                julesSessionId: result.sessionId,
              });
            } else {
              // New session failed, clear old session info
              app.julesSessionId = undefined;
              app.julesSessionUrl = undefined;
              app.julesSessionState = undefined;
            }
          } else {
            // Clear session info for completed apps
            app.julesSessionId = undefined;
            app.julesSessionUrl = undefined;
            app.julesSessionState = undefined;
          }
        }

        modified = true;
      } finally {
        // Always release lock
        processingApps.delete(app.name);
      }
    }

    // If session failed, increment attempts and log
    if (status.isFailed) {
      await logHistory(app.name, "jules_failed", {
        to: app.phase,
        reason: `Jules session failed/cancelled`,
        julesSessionId: app.julesSessionId,
      });

      await logHistory(app.name, "phase_failed", {
        to: app.phase,
        reason: `Jules session failed`,
      });

      app.attempts++;
      app.julesSessionId = undefined;
      app.julesSessionUrl = undefined;
      app.julesSessionState = undefined;
      app.updatedAt = new Date().toISOString();

      modified = true;
    }
  }

  if (modified) {
    await saveState(state);
  }
}

/**
 * GET /api/admin/app-factory
 * Returns dashboard data
 */
export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(requireAdminByUserId(session.user.id));

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check and auto-advance Jules sessions
  await checkAndAdvanceJulesSessions();

  // Load state
  const state = await loadState();
  const apps = state ? Object.values(state.apps) : [];

  // Load history
  const history = await loadRecentHistory(100);

  // Calculate statistics
  const statistics = calculateStatistics(apps, history);

  // Fetch Jules capacity
  const julesCapacity = await fetchJulesCapacity();

  // Get apps not yet in pipeline from master list
  const activeAppNames = new Set(apps.map((a) => a.name));
  const availableMasterList = MASTER_LIST.filter((m) => !activeAppNames.has(m.name));

  const response: AppFactoryDashboardData = {
    apps,
    statistics,
    recentActivity: history.slice(0, 50),
    masterList: availableMasterList,
    julesCapacity,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}

/**
 * POST /api/admin/app-factory
 * Move an app to a different phase (manual intervention) or add a new app
 */
export async function POST(request: NextRequest) {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(requireAdminByUserId(session.user.id));

  if (adminError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: body, error: jsonError } = await tryCatch(request.json());

  if (jsonError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Check if this is a move or add request
  if ("toPhase" in body) {
    // Move app request
    const { appName, toPhase, reason } = body as MoveAppRequest & { startJules?: boolean; };
    const startJules = body.startJules !== false; // Default to true

    if (!appName || !toPhase) {
      return NextResponse.json(
        { error: "Missing appName or toPhase" },
        { status: 400 },
      );
    }

    // Validate appName to prevent prototype pollution and path traversal
    if (!isValidAppName(appName)) {
      return NextResponse.json(
        { error: "Invalid app name format" },
        { status: 400 },
      );
    }

    if (!PHASES_ORDERED.includes(toPhase)) {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    }

    const state = await loadState();
    if (!state || !state.apps[appName]) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    const app = state.apps[appName];
    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    const fromPhase = app.phase;

    app.phase = toPhase;
    app.updatedAt = new Date().toISOString();

    // Clear previous Jules session info
    app.julesSessionId = undefined;
    app.julesSessionUrl = undefined;
    app.julesSessionState = undefined;

    await logHistory(appName, "manual_move", {
      from: fromPhase,
      to: toPhase,
      reason: reason || "Manual intervention",
    });

    // Start Jules session for the new phase if not complete
    let julesResult: CreateSessionResult | null = null;
    if (startJules && toPhase !== "complete") {
      julesResult = await createJulesSession(app, toPhase);
      if (julesResult.success && julesResult.sessionId) {
        app.julesSessionId = julesResult.sessionId;
        app.julesSessionUrl = julesResult.sessionUrl;
        app.julesSessionState = "PENDING";

        await logHistory(appName, "jules_started", {
          to: toPhase,
          reason: `Started Jules session for ${toPhase}`,
          julesSessionId: julesResult.sessionId,
        });
      }
    }

    await saveState(state);

    return NextResponse.json({
      success: true,
      app,
      message: `Moved ${appName} from ${fromPhase} to ${toPhase}${
        julesResult?.success ? ` - Jules started ${toPhase}` : ""
      }`,
      julesSession: julesResult,
    });
  } else {
    // Add app request
    const { name, category, description } = body as AddAppRequest & { startJules?: boolean; };
    const startJules = body.startJules !== false; // Default to true

    if (!name || !category) {
      return NextResponse.json({ error: "Missing name or category" }, { status: 400 });
    }

    // Validate name to prevent prototype pollution and path traversal
    if (!isValidAppName(name)) {
      return NextResponse.json(
        { error: "Invalid app name format. Use lowercase letters, numbers, and hyphens only." },
        { status: 400 },
      );
    }

    let state = await loadState();
    if (!state) {
      state = { apps: {}, lastUpdated: new Date().toISOString() };
    }

    if (state.apps[name]) {
      return NextResponse.json({ error: "App already exists" }, { status: 409 });
    }

    const newApp: AppState = {
      name,
      category,
      phase: "plan",
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Start Jules session for planning if requested
    let julesResult: CreateSessionResult | null = null;
    if (startJules) {
      julesResult = await createJulesSession(newApp, "plan", description);
      if (julesResult.success && julesResult.sessionId) {
        newApp.julesSessionId = julesResult.sessionId;
        newApp.julesSessionUrl = julesResult.sessionUrl;
        newApp.julesSessionState = "PENDING";
      }
    }

    state.apps[name] = newApp;
    await saveState(state);

    await logHistory(name, "initialized", {
      to: "plan",
      reason: description || `Added from dashboard`,
    });

    if (julesResult?.success) {
      await logHistory(name, "jules_started", {
        to: "plan",
        reason: `Started Jules session for planning`,
        julesSessionId: julesResult.sessionId,
      });
    }

    return NextResponse.json({
      success: true,
      app: newApp,
      message: `Added ${name} to pipeline${
        julesResult?.success ? " - Jules started planning" : ""
      }`,
      julesSession: julesResult,
    });
  }
}
