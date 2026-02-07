import { generateStructuredResponse, StructuredResponseParseError } from "@/lib/ai/gemini-client";
import logger from "@/lib/logger";
import { z } from "zod";
import { extractKeywords, matchesAny } from "./keyword-utils";

export { extractKeywords, matchesAny } from "./keyword-utils";

// --- Valid Lucide Icon Names (shared by prompt + post-processing validation) ---

export const LUCIDE_ICONS = new Set([
  // Core navigation & arrows
  "ChevronDown",
  "ChevronUp",
  "ChevronLeft",
  "ChevronRight",
  "ArrowDown",
  "ArrowUp",
  "ArrowLeft",
  "ArrowRight",
  "Menu",
  "Search",
  "ExternalLink",
  "Link",
  // Feedback & status
  "AlertCircle",
  "AlertTriangle",
  "Info",
  "HelpCircle",
  "CheckCircle",
  "XCircle",
  "Loader2",
  "Clock",
  "Ban",
  "Activity",
  // Actions
  "X",
  "Plus",
  "Minus",
  "Check",
  "Copy",
  "Trash2",
  "Pencil",
  "Save",
  "Download",
  "Upload",
  "RefreshCw",
  "RotateCcw",
  "Undo2",
  "Redo2",
  "Filter",
  // Objects
  "Home",
  "Settings",
  "User",
  "Users",
  "Bell",
  "Heart",
  "Star",
  "Bookmark",
  "Eye",
  "EyeOff",
  "Lock",
  "Unlock",
  "Shield",
  "Key",
  "Zap",
  "Sun",
  "Moon",
  "Image",
  "Mail",
  "Send",
  "Play",
  "Pause",
]);

const GeneratedAppSchema = z.object({
  plan: z.string().optional().describe(
    "Optional 1-2 sentence architecture plan before writing code",
  ),
  title: z.string().describe("The name of the app"),
  description: z.string().describe("A concise 1-sentence description of what the app does"),
  code: z.string().describe(
    "The complete, self-contained React component code (using Tailwind CSS)",
  ),
  relatedApps: z.array(z.string()).describe(
    "List of 3-5 related app paths that user might want to try next (e.g. 'cooking/french', 'games/tic-tac-toe')",
  ),
});

export type GeneratedAppContent = Omit<z.infer<typeof GeneratedAppSchema>, "plan">;

export type GenerationResult = {
  content: GeneratedAppContent | null;
  rawCode: string | null;
  error: string | null;
};

// --- Lean Core Prompt (always included) ---

const CORE_PROMPT =
  `You are an expert React developer building polished, production-quality micro-apps.

## RUNTIME ENVIRONMENT
- React 19 with JSX runtime
- Tailwind CSS 4 (all utility classes available)
- Component receives optional \`width\` and \`height\` props (number, pixels)
- npm packages load from CDN automatically
- Component must be DEFAULT EXPORT
- Light theme by default — use semantic color classes (bg-background, text-foreground, etc.)
- Design Tokens for Premium Look:
  - Glass: "bg-background/80 backdrop-blur-md border-border/50"
  - Shadow: "shadow-xl shadow-primary/5"
  - Typography: headings use "tracking-tight font-bold", labels "font-medium text-sm"


## SHADCN/UI DESIGN SYSTEM (import from "@/components/ui/...")
- @/lib/utils: cn() for conditional class composition
- @/components/ui/button: Button (variant: default|outline|secondary|ghost|link, size: default|sm|lg|icon)
- @/components/ui/card: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter (structural wrappers)
- @/components/ui/input: Input (standard text input)
- @/components/ui/label: Label (associated with forms/inputs)
- @/components/ui/badge: Badge (variant: default|secondary|outline|destructive)
- @/components/ui/dialog: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription (modals)
- @/components/ui/tabs: Tabs, TabsList, TabsTrigger, TabsContent (horizontal navigation)
- @/components/ui/select: Select, SelectTrigger, SelectValue, SelectContent, SelectItem (dropdown pickers)
- @/components/ui/tooltip: Tooltip, TooltipTrigger, TooltipContent (hover info)
- @/components/ui/alert: Alert, AlertTitle, AlertDescription (status banners)
- @/components/ui/separator: Separator (thin dividers)
- @/components/ui/scroll-area: ScrollArea (custom scrollbars)
- @/components/ui/skeleton: Skeleton (loading placeholder)
- @/components/ui/dropdown-menu: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
- @/components/ui/sheet: Sheet, SheetTrigger, SheetContent (side panels)
- @/components/ui/progress: Progress (value: 0-100)


## PRE-LOADED LIBRARIES (zero load time)
- react (useState, useEffect, useCallback, useMemo, useRef, useReducer)
- framer-motion (motion, AnimatePresence, useMotionValue, useSpring)
- lucide-react — Icons. STRICT RULES:
  1. Every icon in JSX MUST have a matching import { IconName } from "lucide-react" at the top.
  2. Only import icons you actually render in JSX. Maximum 5 icons per component.
  3. Do NOT invent icon names. Only use names from the list below.
  Example: import { Heart, Star, X } from "lucide-react";
  Core: ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, Menu, Search, ExternalLink, Link
  Feedback: AlertCircle, AlertTriangle, Info, HelpCircle, CheckCircle, XCircle, Loader2, Clock, Ban, Activity
  Actions: X, Plus, Minus, Check, Copy, Trash2, Pencil, Save, Download, Upload, RefreshCw, RotateCcw, Undo2, Redo2, Filter
  Objects: Home, Settings, User, Users, Bell, Heart, Star, Bookmark, Eye, EyeOff, Lock, Unlock, Shield, Key, Zap, Sun, Moon, Image, Mail, Send, Play, Pause
- clsx, tailwind-merge (for cn() — already available via @/lib/utils)

## CDN-AVAILABLE LIBRARIES (import by name)
- date-fns (format, parseISO, addDays, differenceInDays, startOfWeek, etc.)
- zustand (create for complex state management)
- sonner (toast, toast.success, toast.error for notifications — add <Toaster /> in JSX)

## LAYOUT PATTERNS (Modern & Responsive)
- Modern Card: Use "bg-card/50 border-border/50 shadow-sm" with a header-content-footer structure.
- Responsive Grid: Use "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" for collections.
- Interactive List: Use "divide-y divide-border/30" with hover highlights on items.

## CODE QUALITY RULES
1. Use shadcn/ui components instead of raw HTML wherever a matching component exists
2. Never call hooks conditionally — all hooks at top of component
3. Handle edge cases: empty states, loading states, error boundaries
4. PREFER semantic color classes: text-foreground, bg-background, bg-card, text-muted-foreground, border-border
5. Use responsive classes (sm:, md:, lg:) for mobile-first design
6. Include ARIA labels on custom interactive elements
7. Use semantic HTML (main, section, nav, header, footer)
8. Keep state local — do not create React context for single-component apps
9. No inline styles — use Tailwind 4 classes exclusively (e.g., use "grid-cols-subgrid" where useful)
10. Never use setTimeout/setInterval with functions that read React state — state will be stale. Pass computed values as arguments instead.
11. Icons are decoration, not content. Prefer text labels and emoji over icons.
12. For complexity, split code into internal sub-components (e.g., const Header = ...) within the same file.

## FINAL VERIFICATION CHECKLIST
- [ ] Are all used icons imported from "lucide-react"? (Max 5)
- [ ] Is there exactly one DEFAULT EXPORT?
- [ ] Are semantic colors like "bg-background" used for the container?
- [ ] Is the UI fully responsive and premium-feeling?

Before writing code, mentally plan: key user interactions, state variables, visual hierarchy, and which shadcn/ui components to use.`;

// --- Skill Types ---

export type SkillCategory =
  | "3d"
  | "data-viz"
  | "game"
  | "form"
  | "dnd"
  | "drawing"
  | "content"
  | "audio"
  | "url-params";

export interface Skill {
  id: string;
  name: string;
  icon: string;
  category: SkillCategory;
  categoryLabel: string;
  triggers: string[];
  promptContent: string;
  description: string;
}

export interface MatchedSkill {
  id: string;
  name: string;
  icon: string;
  category: SkillCategory;
  categoryLabel: string;
  description: string;
}

// --- Category Triggers (shared per category) ---

const CATEGORY_TRIGGERS: Record<SkillCategory, string[]> = {
  "3d": [
    "three",
    "3d",
    "globe",
    "scene",
    "orbit",
    "planet",
    "cube",
    "sphere",
    "terrain",
    "space",
    "solar",
    "earth",
    "webgl",
  ],
  "data-viz": [
    "chart",
    "charts",
    "dashboard",
    "analytics",
    "stats",
    "graph",
    "graphs",
    "metrics",
    "finance",
    "stock",
    "tracker",
    "data",
    "visualization",
    "reporting",
    "trending",
  ],
  "game": [
    "game",
    "games",
    "gaming",
    "gameplay",
    "player",
    "playing",
    "play",
    "puzzle",
    "quiz",
    "tictactoe",
    "chess",
    "snake",
    "tetris",
    "wordle",
    "sudoku",
    "maze",
    "arcade",
  ],
  "form": [
    "form",
    "forms",
    "survey",
    "signup",
    "checkout",
    "wizard",
    "booking",
    "contact",
    "calculator",
    "converter",
    "registration",
  ],
  "dnd": [
    "kanban",
    "board",
    "boards",
    "drag",
    "draggable",
    "sort",
    "sorting",
    "sortable",
    "reorder",
    "planner",
    "calendar",
    "schedule",
    "timeline",
    "todo",
    "todos",
    "builder",
    "rank",
  ],
  "drawing": [
    "draw",
    "drawing",
    "paint",
    "painting",
    "sketch",
    "canvas",
    "whiteboard",
    "doodle",
    "art",
    "artistic",
    "signature",
    "diagram",
  ],
  "content": [
    "blog",
    "blogging",
    "story",
    "stories",
    "writing",
    "note",
    "notes",
    "notebook",
    "journal",
    "recipe",
    "wiki",
    "markdown",
    "article",
    "articles",
    "portfolio",
    "gallery",
  ],
  "audio": [
    "music",
    "musical",
    "audio",
    "sound",
    "beat",
    "beats",
    "drum",
    "drums",
    "piano",
    "instrument",
    "synth",
    "metronome",
    "rhythm",
    "melody",
    "guitar",
  ],
  "url-params": ["dashboard", "tracker", "monitor", "analytics", "config", "settings"],
};

// --- Skills Definitions ---

const SKILLS: Skill[] = [
  // 3D
  {
    id: "three-js",
    name: "Three.js",
    icon: "🧊",
    category: "3d",
    categoryLabel: "3D RENDERING",
    triggers: CATEGORY_TRIGGERS["3d"],
    promptContent:
      '- three (Three.js — import THREE from "three")\n- Performance: Use requestAnimationFrame, dispose geometries/materials on unmount',
    description: "3D scene rendering with Three.js",
  },
  {
    id: "three-perf",
    name: "3D Performance",
    icon: "🎯",
    category: "3d",
    categoryLabel: "3D RENDERING",
    triggers: CATEGORY_TRIGGERS["3d"],
    promptContent:
      "- Prefer OrbitControls for camera interaction\n- Keep polygon counts reasonable for browser performance",
    description: "OrbitControls and performance patterns",
  },
  // Data Viz
  {
    id: "recharts",
    name: "Recharts",
    icon: "📊",
    category: "data-viz",
    categoryLabel: "DATA VISUALIZATION",
    triggers: CATEGORY_TRIGGERS["data-viz"],
    promptContent:
      "- recharts (LineChart, BarChart, PieChart, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer)",
    description: "Interactive charts and graphs",
  },
  {
    id: "chart-ui",
    name: "Chart UI",
    icon: "📈",
    category: "data-viz",
    categoryLabel: "DATA VISUALIZATION",
    triggers: CATEGORY_TRIGGERS["data-viz"],
    promptContent:
      "- @/components/ui/chart: ChartContainer, ChartTooltip, ChartTooltipContent (recharts wrapper)",
    description: "shadcn/ui chart components",
  },
  // Game
  {
    id: "canvas-confetti",
    name: "Confetti",
    icon: "🎉",
    category: "game",
    categoryLabel: "GAME DEVELOPMENT",
    triggers: CATEGORY_TRIGGERS["game"],
    promptContent: "- canvas-confetti (confetti() for celebration/win effects)",
    description: "Celebration and win effects",
  },
  {
    id: "howler-game",
    name: "Game Audio",
    icon: "🔊",
    category: "game",
    categoryLabel: "GAME DEVELOPMENT",
    triggers: CATEGORY_TRIGGERS["game"],
    promptContent: '- Sound effects: use howler — import { Howl } from "howler"',
    description: "Game sound effects with Howler.js",
  },
  // Form
  {
    id: "react-hook-form",
    name: "React Hook Form",
    icon: "📝",
    category: "form",
    categoryLabel: "FORMS & VALIDATION",
    triggers: CATEGORY_TRIGGERS["form"],
    promptContent:
      "- react-hook-form (useForm, Controller) + zod (z.string(), z.object() for validation)\n- @/components/ui/form: Form, FormField, FormItem, FormLabel, FormControl, FormMessage",
    description: "Form state management and validation",
  },
  {
    id: "form-ui",
    name: "Form Components",
    icon: "🎛️",
    category: "form",
    categoryLabel: "FORMS & VALIDATION",
    triggers: CATEGORY_TRIGGERS["form"],
    promptContent:
      "- @/components/ui/checkbox: Checkbox\n- @/components/ui/switch: Switch\n- @/components/ui/slider: Slider\n- @/components/ui/radio-group: RadioGroup, RadioGroupItem\n- @/components/ui/textarea: Textarea",
    description: "Checkbox, switch, slider, radio, textarea",
  },
  // DnD
  {
    id: "dnd-kit",
    name: "DnD Kit",
    icon: "🖱️",
    category: "dnd",
    categoryLabel: "DRAG & DROP",
    triggers: CATEGORY_TRIGGERS["dnd"],
    promptContent:
      "- @dnd-kit/core + @dnd-kit/sortable (DndContext, SortableContext, useSortable for drag & drop)",
    description: "Drag and drop with sortable lists",
  },
  // Drawing
  {
    id: "roughjs",
    name: "Rough.js",
    icon: "✏️",
    category: "drawing",
    categoryLabel: "DRAWING & CANVAS",
    triggers: CATEGORY_TRIGGERS["drawing"],
    promptContent: "- roughjs (rough.canvas() or rough.svg() for hand-drawn style graphics)",
    description: "Hand-drawn style graphics",
  },
  // Content
  {
    id: "react-markdown",
    name: "React Markdown",
    icon: "📄",
    category: "content",
    categoryLabel: "CONTENT & MARKDOWN",
    triggers: CATEGORY_TRIGGERS["content"],
    promptContent: "- react-markdown (ReactMarkdown component for rendering markdown)",
    description: "Markdown rendering",
  },
  {
    id: "content-ui",
    name: "Content UI",
    icon: "🗂️",
    category: "content",
    categoryLabel: "CONTENT & MARKDOWN",
    triggers: CATEGORY_TRIGGERS["content"],
    promptContent:
      "- @/components/ui/accordion: Accordion, AccordionItem, AccordionTrigger, AccordionContent\n- @/components/ui/avatar: Avatar, AvatarImage, AvatarFallback\n- @/components/ui/pagination: Pagination, PaginationContent, PaginationItem, PaginationLink\n- @/components/ui/table: Table, TableHeader, TableBody, TableRow, TableHead, TableCell",
    description: "Accordion, avatar, pagination, table components",
  },
  // Audio
  {
    id: "howler",
    name: "Howler.js",
    icon: "🎵",
    category: "audio",
    categoryLabel: "AUDIO & SOUND",
    triggers: CATEGORY_TRIGGERS["audio"],
    promptContent:
      "- howler (new Howl({ src: [url], sprite: {...} }) — full audio playback, sprites, volume, seek)",
    description: "Full audio playback and sprites",
  },
  {
    id: "web-audio",
    name: "Web Audio",
    icon: "🎹",
    category: "audio",
    categoryLabel: "AUDIO & SOUND",
    triggers: CATEGORY_TRIGGERS["audio"],
    promptContent:
      "- Web Audio API: AudioContext, OscillatorNode, GainNode for synthesis\n- Patterns: useRef for AudioContext (create on user gesture), cleanup on unmount",
    description: "Audio synthesis with Web Audio API",
  },
  // URL Params
  {
    id: "url-params",
    name: "URL Params",
    icon: "🔗",
    category: "url-params",
    categoryLabel: "URL PARAMETER SUPPORT",
    triggers: CATEGORY_TRIGGERS["url-params"],
    promptContent: `The component MUST support receiving initial data via URL search parameters:
1. Read URL params at component top level:
   const params = new URLSearchParams(window.location.search);
2. Parse param values (JSON for complex data, strings for simple):
   const initialItems = (() => { try { return JSON.parse(params.get("items") || "null"); } catch { return null; } })();
3. Use parsed values as initial state with sensible fallback defaults:
   const [items, setItems] = useState(initialItems ?? DEFAULT_ITEMS);
4. Sync state back to URL so the link stays shareable:
   useEffect(() => { const url = new URL(window.location.href); url.searchParams.set("items", JSON.stringify(items)); window.history.replaceState({}, "", url); }, [items]);
5. Keep param names short (e.g., "items", "title", "view", "config").
6. Handle malformed/missing params gracefully — never crash on bad input.
7. Do NOT use param name "room" — it is reserved by the runtime.
8. Add a comment at the top listing accepted URL params.`,
    description: "Shareable state via URL search params",
  },
];

const FALLBACK_LIBS = `
## ADDITIONAL CDN LIBRARIES (import by name when relevant)
- recharts — charts and data visualization
- react-hook-form + zod — form validation
- react-markdown — render markdown content
- canvas-confetti — celebration effects
- @dnd-kit/core + @dnd-kit/sortable — drag and drop
- roughjs — hand-drawn style graphics
- howler — audio playback
- three — 3D rendering (large bundle)`;

// --- Skill Matching ---

export function getMatchedSkills(topic: string): MatchedSkill[] {
  const keywords = extractKeywords(topic);
  const seen = new Set<string>();
  const matched: MatchedSkill[] = [];

  for (const skill of SKILLS) {
    if (!seen.has(skill.id) && matchesAny(keywords, skill.triggers)) {
      seen.add(skill.id);
      matched.push({
        id: skill.id,
        name: skill.name,
        icon: skill.icon,
        category: skill.category,
        categoryLabel: skill.categoryLabel,
        description: skill.description,
      });
    }
  }

  logger.debug("Skill matching result", {
    topic,
    keywords,
    matchedSkillIds: matched.map((s) => s.id),
    matchedCategories: [...new Set(matched.map((s) => s.category))],
  });

  return matched;
}

// --- Dynamic Prompt Builder ---

export function buildSystemPrompt(topic: string): string {
  const keywords = extractKeywords(topic);

  // Group matched skills by category, preserving SKILLS array order
  const categoryOrder: SkillCategory[] = [];
  const categorySkills = new Map<SkillCategory, Skill[]>();

  for (const skill of SKILLS) {
    if (matchesAny(keywords, skill.triggers)) {
      if (!categorySkills.has(skill.category)) {
        categoryOrder.push(skill.category);
        categorySkills.set(skill.category, []);
      }
      categorySkills.get(skill.category)!.push(skill);
    }
  }

  if (categoryOrder.length === 0) {
    logger.info("System prompt built with fallback", { topic, keywords });
    return CORE_PROMPT + "\n" + FALLBACK_LIBS;
  }

  const sections: string[] = [];
  for (const category of categoryOrder) {
    const skills = categorySkills.get(category)!;
    const header = `\n## ${skills[0]!.categoryLabel}`;
    const lines = skills.map((s) => s.promptContent).join("\n");
    sections.push(header + "\n" + lines);
  }

  logger.info("System prompt built with matched categories", {
    topic,
    keywords,
    categories: categoryOrder,
  });

  return CORE_PROMPT + "\n" + sections.join("\n");
}

// Backward compatibility — general-purpose prompt with all layers
export const SYSTEM_PROMPT = buildSystemPrompt("general");

export function buildUserPrompt(topic: string): string {
  const keywords = extractKeywords(topic);
  const includeUrlParams = matchesAny(keywords, CATEGORY_TRIGGERS["url-params"]);

  const urlParamInstruction = includeUrlParams
    ? `\n\nIMPORTANT: The component must read URL search params (via new URLSearchParams(window.location.search)) as initial/default values. When state changes, sync back to URL with window.history.replaceState so the URL is always shareable. Provide sensible defaults when no params are present.`
    : "";

  return `Build an interactive app for: "/create/${topic}"

Interpret this path as user intent. Examples:
- "cooking/pasta" → Interactive recipe browser with cooking timers
- "games/tictactoe" → Fully playable Tic-Tac-Toe with AI opponent
- "tools/calculator" → Beautiful scientific calculator
- "finance/mortgage" → Mortgage calculator with amortization chart
- "fitness/timer" → Workout interval timer with presets

## EXAMPLE RESPONSES (follow this structure exactly)

Example 1 — Simple counter:
{
  "title": "Click Counter",
  "description": "A satisfying click counter with animations and streak tracking",
  "plan": "useState for count and streak. Button with motion.div scale animation on click. Badge shows streak. Card layout with semantic colors.",
  "code": "import { useState } from \"react\";\\nimport { motion } from \"framer-motion\";\\nimport { Button } from \"@/components/ui/button\";\\nimport { Card, CardHeader, CardTitle, CardContent } from \"@/components/ui/card\";\\nimport { Badge } from \"@/components/ui/badge\";\\n\\nexport default function ClickCounter() {\\n  const [count, setCount] = useState(0);\\n  return (\\n    <div className=\\"min-h-screen bg-background flex items-center justify-center p-4\\">\\n      <Card className=\\"w-full max-w-sm\\">\\n        <CardHeader><CardTitle className=\\"tracking-tight\\">Counter</CardTitle></CardHeader>\\n        <CardContent className=\\"flex flex-col items-center gap-4\\">\\n          <motion.div key={count} initial={{ scale: 1.3 }} animate={{ scale: 1 }}>\\n            <span className=\\"text-6xl font-bold text-foreground\\">{count}</span>\\n          </motion.div>\\n          <Badge variant=\\"secondary\\">{count > 10 ? '🔥 On fire!' : 'Keep going'}</Badge>\\n          <div className=\\"flex gap-2\\">\\n            <Button onClick={() => setCount(c => c + 1)}>+1</Button>\\n            <Button variant=\\"outline\\" onClick={() => setCount(0)}>Reset</Button>\\n          </div>\\n        </CardContent>\\n      </Card>\\n    </div>\\n  );\\n}",
  "relatedApps": ["tools/timer", "games/clicker", "tools/scoreboard"]
}

Example 2 — Task tracker:
{
  "title": "Quick Tasks",
  "description": "A minimal task tracker with animations and completion effects",
  "plan": "useState for tasks array and input. AnimatePresence for add/remove animations. Input + Button for adding. Map tasks with Check/Trash2 icons. Filter completed vs pending.",
  "code": "import { useState } from \"react\";\\nimport { motion, AnimatePresence } from \"framer-motion\";\\nimport { Check, Trash2 } from \"lucide-react\";\\nimport { Button } from \"@/components/ui/button\";\\nimport { Input } from \"@/components/ui/input\";\\nimport { Card, CardHeader, CardTitle, CardContent } from \"@/components/ui/card\";\\n\\nexport default function QuickTasks() {\\n  const [tasks, setTasks] = useState<{ id: number; text: string; done: boolean }[]>([]);\\n  const [input, setInput] = useState('');\\n  const addTask = () => { if (!input.trim()) return; setTasks(t => [...t, { id: Date.now(), text: input.trim(), done: false }]); setInput(''); };\\n  return (\\n    <div className=\\"min-h-screen bg-background flex items-center justify-center p-4\\">\\n      <Card className=\\"w-full max-w-md\\">\\n        <CardHeader><CardTitle className=\\"tracking-tight\\">Tasks</CardTitle></CardHeader>\\n        <CardContent className=\\"space-y-3\\">\\n          <div className=\\"flex gap-2\\"><Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder=\\"Add a task...\\" /><Button onClick={addTask}>Add</Button></div>\\n          <div className=\\"divide-y divide-border/30\\">\\n            <AnimatePresence>{tasks.map(task => (\\n              <motion.div key={task.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 50 }} className=\\"flex items-center justify-between py-2\\">\\n                <span className={task.done ? 'line-through text-muted-foreground' : 'text-foreground'}>{task.text}</span>\\n                <div className=\\"flex gap-1\\">\\n                  <Button size=\\"icon\\" variant=\\"ghost\\" onClick={() => setTasks(t => t.map(x => x.id === task.id ? { ...x, done: !x.done } : x))}><Check className=\\"h-4 w-4\\" /></Button>\\n                  <Button size=\\"icon\\" variant=\\"ghost\\" onClick={() => setTasks(t => t.filter(x => x.id !== task.id))}><Trash2 className=\\"h-4 w-4\\" /></Button>\\n                </div>\\n              </motion.div>\\n            ))}</AnimatePresence>\\n          </div>\\n          {tasks.length === 0 && <p className=\\"text-center text-muted-foreground text-sm\\">No tasks yet</p>}\\n        </CardContent>\\n      </Card>\\n    </div>\\n  );\\n}",
  "relatedApps": ["tools/notes", "tools/kanban", "tools/checklist"]
}
${urlParamInstruction}
Respond with JSON: { title, description, code, relatedApps }
- Optionally include a "plan" field (1-2 sentences) describing your architecture before writing code
- code: raw string (no markdown fences), single default-exported React component
- relatedApps: 3-5 related paths without "/create/" prefix`;
}

function pruneUnusedIcons(code: string): string {
  // 1. Identify Lucide icon imports
  const lucideImportRegex = /import\s*{([^}]+)}\s*from\s*["']lucide-react["'];?/g;
  let match;
  const importsToReplace: Array<{ fullMatch: string; icons: string[]; }> = [];

  while ((match = lucideImportRegex.exec(code)) !== null) {
    const importContent = match[1];
    if (importContent) {
      const icons = importContent.split(",").map((i) => i.trim()).filter(Boolean);
      importsToReplace.push({ fullMatch: match[0], icons });
    }
  }

  if (importsToReplace.length === 0) return code;

  let prunedCode = code;

  for (const { fullMatch, icons } of importsToReplace) {
    // 2. For each icon in this import, check if it's used elsewhere in the code
    // We remove the import itself from the code search to avoid self-matches
    const codeWithoutCurrentImport = prunedCode.replace(fullMatch, "");

    const usedIcons = icons.filter((icon) => {
      // Look for the icon name as a whole word (e.g., <Plus, Plus., Plus )
      const usageRegex = new RegExp(`\\b${icon}\\b`, "g");
      return usageRegex.test(codeWithoutCurrentImport);
    });

    if (usedIcons.length === 0) {
      // No icons from this import are used — remove the whole line
      prunedCode = prunedCode.replace(fullMatch, "");
    } else {
      // Rewrite the import line to prune unused icons AND normalize to double quotes
      const newImport = `import { ${usedIcons.join(", ")} } from "lucide-react";`;
      prunedCode = prunedCode.replace(fullMatch, newImport);
    }
  }

  return prunedCode.trim();
}

function addMissingIconImports(code: string): string {
  // Find all lucide icons used in JSX: <IconName
  const jsxUsagePattern = /<([A-Z][A-Za-z0-9]*)/g;
  const usedIcons = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = jsxUsagePattern.exec(code)) !== null) {
    if (LUCIDE_ICONS.has(m[1]!)) usedIcons.add(m[1]!);
  }
  if (usedIcons.size === 0) return code;

  // Find existing lucide-react import and extract already-imported names
  const importPattern = /^(import\s*\{([^}]*)\}\s*from\s*["']lucide-react["'];?)$/m;
  const existing = importPattern.exec(code);
  const alreadyImported = new Set<string>();
  if (existing) {
    for (const spec of existing[2]!.split(",")) {
      const name = spec.trim().split(/\s+as\s+/)[0]!.trim();
      if (name) alreadyImported.add(name);
    }
  }

  const missing = [...usedIcons].filter((i) => !alreadyImported.has(i)).sort();
  if (missing.length === 0) return code;

  if (existing) {
    // Merge missing icons into existing import
    const original = existing[2]!.trim().replace(/,\s*$/, "");
    const merged = original ? `${original}, ${missing.join(", ")}` : missing.join(", ");
    return code.replace(existing[0], `import { ${merged} } from "lucide-react";`);
  }

  // No existing import — insert after last import statement
  const lastImportPattern = /^import\s.+$/gm;
  let lastIdx = -1;
  let lastLen = 0;
  while ((m = lastImportPattern.exec(code)) !== null) {
    lastIdx = m.index;
    lastLen = m[0].length;
  }
  const newImport = `import { ${missing.join(", ")} } from "lucide-react";`;
  if (lastIdx !== -1) {
    const pos = lastIdx + lastLen;
    return code.slice(0, pos) + "\n" + newImport + code.slice(pos);
  }
  return newImport + "\n" + code;
}

function cleanCode(code: string): string {
  const cleaned = code.replace(/^```tsx?/, "").replace(/^```/, "").replace(/```$/, "").trim();
  // First add missing imports, then prune unused — order matters
  return pruneUnusedIcons(addMissingIconImports(cleaned));
}

export function extractCodeFromRawText(text: string): string | null {
  // Try to extract the "code" field value from malformed JSON
  const codeMatch = text.match(/"code"\s*:\s*"([\s\S]+)/);
  if (!codeMatch?.[1]) return null;

  let code = codeMatch[1];

  // Remove trailing JSON artifacts (closing field patterns)
  code = code.replace(/"\s*,?\s*"(relatedApps|title|description)"\s*:[\s\S]*$/, "");
  code = code.replace(/"\s*,?\s*}\s*$/, "");
  code = code.replace(/"\s*$/, "");

  // Unescape JSON string escapes
  try {
    code = JSON.parse(`"${code}"`);
  } catch {
    code = code.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  code = cleanCode(code);
  return code || null;
}

export async function attemptCodeCorrection(
  code: string,
  error: string,
  topic: string,
): Promise<string | null> {
  try {
    logger.info("Attempting code correction", { topic, error: error.slice(0, 200) });

    const result = await generateStructuredResponse<{ code: string; }>({
      prompt: `The following React component failed transpilation with this error:

ERROR: ${error}

ORIGINAL CODE:
\`\`\`tsx
${code}
\`\`\`

Fix the code so it transpiles successfully. Return JSON: { "code": "<fixed code>" }
- Only fix the transpilation error, do not redesign the component
- Preserve all existing functionality
- code must be a raw string (no markdown fences)`,
      systemPrompt:
        "You are a React/TypeScript expert. Fix the transpilation error in the code. Return only the corrected code in JSON format.",
      maxTokens: 16384,
      temperature: 0.2,
      thinkingBudget: 4096,
    });

    if (result && typeof result.code === "string") {
      const corrected = cleanCode(result.code);
      logger.info("Code correction produced result", { topic, codeLength: corrected.length });
      return corrected || null;
    }

    return null;
  } catch (err) {
    logger.error("Code correction failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return null;
  }
}

export async function generateAppContent(
  path: string[],
): Promise<GenerationResult> {
  const topic = path.join("/");

  try {
    const result = await generateStructuredResponse<GeneratedAppContent>({
      prompt: buildUserPrompt(topic),
      systemPrompt: buildSystemPrompt(topic),
      maxTokens: 32768,
      temperature: 0.5,
      thinkingBudget: 32768,
    });

    // Extract rawCode before validation so it's available even if other fields fail
    const resultObj = result as Record<string, unknown> | null;
    const rawCode = resultObj && typeof resultObj === "object" && "code" in resultObj &&
        typeof resultObj["code"] === "string"
      ? cleanCode(resultObj["code"])
      : null;

    // Clean the code field in-place for validation
    if (result && result.code) {
      result.code = cleanCode(result.code);
    }

    const parsed = GeneratedAppSchema.safeParse(result);
    if (parsed.success) {
      const { plan, ...content } = parsed.data;
      if (plan) {
        logger.info("Generated app plan", { topic, plan });
      }
      return { content, rawCode: content.code, error: null };
    }

    // Validation failed but we may have raw code
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    logger.error("Generated content failed validation:", { error: errorMsg });
    return { content: null, rawCode, error: errorMsg };
  } catch (error) {
    logger.error("Failed to generate app content:", { error });
    const message = error instanceof Error ? error.message : "Unknown error";

    let rawCode: string | null = null;
    if (error instanceof StructuredResponseParseError) {
      rawCode = extractCodeFromRawText(error.rawText);
    }

    return { content: null, rawCode, error: message };
  }
}
