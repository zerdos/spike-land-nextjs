export const HERO_CONTENT = {
  title: "AI Tools for Modern Development",
  subtitle: "Two powerful approaches to accelerate your workflow",
  claude: {
    name: "Claude Code",
    description:
      "The intelligent agent that lives in your terminal. Perfect for planning, complex refactors, and deep architectural changes.",
    // Note: These statistics are snapshots and should be updated periodically or fetched dynamically.
    stats: {
      stars: 135000,
      users: 50000,
    },
  },
  openClaw: {
    name: "OpenClaw",
    description:
      "The secure, local runtime for AI agents. Build, run, and scale your own autonomous coding workflows.",
    stats: {
      downloads: 1200000,
      contributors: 450,
    },
  },
};

export const PITFALLS_CONTENT = [
  {
    id: "jump-to-code",
    title: "Claude jumps to coding too early",
    severity: "critical",
    problem:
      "When given a vague task, Claude often starts writing code immediately without checking the existing system.",
    solution:
      "Force a planning phase first. Use 'Plan' mode or explicitly ask for an implementation plan before any code is written.",
  },
  {
    id: "give-up",
    title: "Claude gives up on errors",
    severity: "high",
    problem:
      "After a few failed attempts at fixing a bug/test, Claude might suggest reverting or giving up.",
    solution:
      "Provide specific error logs and ask to 'Think step-by-step' about the root cause. Don't let it brute force.",
  },
  {
    id: "kitchen-sink",
    title: "Kitchen sink context",
    severity: "medium",
    problem: "Adding too many files to the context window makes Claude confused and forgetful.",
    solution:
      "Use the `remove` command to clear irrelevant files. Keep the context focused on the immediate task.",
  },
  {
    id: "security",
    title: "Security Risks",
    severity: "critical",
    problem: "Running unverified AI commands can accidentally delete files or expose keys.",
    solution: "Always review `run_command` proposals. Use OpenClaw for a sandboxed environment.",
  },
] as const;

export const MODEL_COMPARISON = [
  {
    name: "Opus 4.5",
    speed: 76,
    cost: 5,
    score: 74.5,
    description: "The smartest model. Best for complex reasoning and architecture.",
    recommended: true,
  },
  {
    name: "Sonnet 4.5",
    speed: 86,
    cost: 1,
    score: 72.7,
    description: "The balanced workhorse. Good for daily coding tasks.",
    recommended: false,
  },
  {
    name: "Haiku 4.5",
    speed: 27,
    cost: 0.2,
    score: 65,
    description: "Fast and cheap. Best for simple functions and tests.",
    recommended: false,
  },
];
