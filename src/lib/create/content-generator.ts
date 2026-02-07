import { generateStructuredResponse, StructuredResponseParseError } from "@/lib/ai/gemini-client";
import logger from "@/lib/logger";
import { z } from "zod";
import { extractKeywords, matchesAny } from "./keyword-utils";

export { extractKeywords, matchesAny } from "./keyword-utils";

const GeneratedAppSchema = z.object({
  title: z.string().describe("The name of the app"),
  description: z.string().describe("A concise 1-sentence description of what the app does"),
  code: z.string().describe(
    "The complete, self-contained React component code (using Tailwind CSS)",
  ),
  relatedApps: z.array(z.string()).describe(
    "List of 3-5 related app paths that user might want to try next (e.g. 'cooking/french', 'games/tic-tac-toe')",
  ),
});

export type GeneratedAppContent = z.infer<typeof GeneratedAppSchema>;

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

## SHADCN/UI DESIGN SYSTEM (import from "@/components/ui/...")
- @/lib/utils: cn() for conditional class composition
- @/components/ui/button: Button (variants: default/destructive/outline/secondary/ghost/link)
- @/components/ui/card: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- @/components/ui/input: Input
- @/components/ui/label: Label
- @/components/ui/badge: Badge
- @/components/ui/dialog: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription
- @/components/ui/tabs: Tabs, TabsList, TabsTrigger, TabsContent
- @/components/ui/select: Select, SelectTrigger, SelectValue, SelectContent, SelectItem
- @/components/ui/tooltip: Tooltip, TooltipTrigger, TooltipContent, TooltipProvider
- @/components/ui/alert: Alert, AlertTitle, AlertDescription
- @/components/ui/separator: Separator
- @/components/ui/scroll-area: ScrollArea
- @/components/ui/skeleton: Skeleton
- @/components/ui/dropdown-menu: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
- @/components/ui/sheet: Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle
- @/components/ui/progress: Progress

## PRE-LOADED LIBRARIES (zero load time)
- react (useState, useEffect, useCallback, useMemo, useRef, useReducer)
- framer-motion (motion, AnimatePresence, useMotionValue, useSpring)
- lucide-react — ONLY use icons from this verified list:
  Navigation: ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, ChevronsLeft, ChevronsRight, ChevronFirst, ChevronLast
  Arrows: ArrowDown, ArrowUp, ArrowLeft, ArrowRight, ArrowUpDown, ArrowLeftRight, MoveDown, MoveUp, Undo2, Redo2
  Actions: X, Menu, Plus, Minus, Check, Copy, Trash2, Pencil, Save, Download, Upload, RefreshCw, RotateCcw, ExternalLink, Link, Unlink, Grip, GripVertical
  Status: AlertCircle, AlertTriangle, Info, HelpCircle, CheckCircle, XCircle, Loader2, Clock, Timer, Ban
  Objects: Home, Settings, User, Users, Search, Bell, Heart, Star, Bookmark, Eye, EyeOff, Lock, Unlock, Shield, Key, Zap, Flame, Sun, Moon, CloudSun
  Media: Image, Camera, Video, File, FileText, Folder, FolderOpen, Music, Play, Pause, SquareIcon, Volume2, VolumeX, Mic
  Communication: Mail, MessageSquare, MessageCircle, Phone, Send, Share2, AtSign
  Layout: LayoutDashboard, Columns, Rows, PanelLeft, SidebarOpen, SidebarClose, Maximize2, Minimize2, Fullscreen
  Data: BarChart3, LineChart, PieChart, TrendingUp, TrendingDown, Activity, Filter, SlidersHorizontal, ListOrdered, Table2, Hash
  IMPORTANT: Do NOT invent icon names. No "ChevronDoubleDown", "EyeClosed", "FileIcon", etc.
- clsx, tailwind-merge (for cn() — already available via @/lib/utils)

## CDN-AVAILABLE LIBRARIES (import by name)
- date-fns (format, parseISO, addDays, differenceInDays, startOfWeek, etc.)
- zustand (create for complex state management)
- sonner (toast, toast.success, toast.error for notifications — add <Toaster /> in JSX)

## CODE QUALITY RULES
1. Use shadcn/ui components instead of raw HTML wherever a matching component exists
2. Never call hooks conditionally — all hooks at top of component
3. Handle edge cases: empty states, loading states, error boundaries
4. PREFER semantic color classes: text-foreground, bg-background, bg-card, text-muted-foreground, border-border — these automatically resolve to the correct theme colors
5. Use responsive classes (sm:, md:, lg:) for mobile-first design
6. Include ARIA labels on custom interactive elements
7. Use semantic HTML (main, section, nav, header, footer)
8. Keep state local — do not create React context for single-component apps
9. No inline styles — use Tailwind classes exclusively
10. Never use setTimeout/setInterval with functions that read React state — state will be stale. Pass computed values as arguments instead.
11. Limit icon imports to 6-8 icons maximum per component. Prefer semantic alternatives (text labels, colors, shapes) over additional icons.

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
    return CORE_PROMPT + "\n" + FALLBACK_LIBS;
  }

  const sections: string[] = [];
  for (const category of categoryOrder) {
    const skills = categorySkills.get(category)!;
    const header = `\n## ${skills[0]!.categoryLabel}`;
    const lines = skills.map((s) => s.promptContent).join("\n");
    sections.push(header + "\n" + lines);
  }

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
${urlParamInstruction}
Respond with JSON: { title, description, code, relatedApps }
- code: raw string (no markdown fences), single default-exported React component
- relatedApps: 3-5 related paths without "/create/" prefix`;
}

function cleanCode(code: string): string {
  return code.replace(/^```tsx?/, "").replace(/^```/, "").replace(/```$/, "").trim();
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
      return { content: parsed.data, rawCode: parsed.data.code, error: null };
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
