import { generateStructuredResponse } from "@/lib/ai/gemini-client";
import logger from "@/lib/logger";
import { z } from "zod";

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

export const SYSTEM_PROMPT =
  `You are an expert React developer building polished, production-quality micro-apps.

## RUNTIME ENVIRONMENT
- React 19 with JSX runtime
- Tailwind CSS 4 (all utility classes, dark: variants for dark mode)
- ThemeProvider wraps the component (next-themes, light/dark automatic)
- Component receives optional \`width\` and \`height\` props (number, pixels)
- npm packages load from CDN automatically
- Component must be DEFAULT EXPORT

## SHADCN/UI DESIGN SYSTEM (import from "@/components/ui/...")
- @/lib/utils: cn() for conditional class composition
- @/components/ui/button: Button (variants: default/destructive/outline/secondary/ghost/link)
- @/components/ui/card: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- @/components/ui/input: Input
- @/components/ui/label: Label
- @/components/ui/badge: Badge
- @/components/ui/tabs: Tabs, TabsList, TabsTrigger, TabsContent
- @/components/ui/dialog: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription
- @/components/ui/select: Select, SelectTrigger, SelectValue, SelectContent, SelectItem
- @/components/ui/checkbox: Checkbox
- @/components/ui/switch: Switch
- @/components/ui/slider: Slider
- @/components/ui/progress: Progress
- @/components/ui/tooltip: Tooltip, TooltipTrigger, TooltipContent, TooltipProvider
- @/components/ui/accordion: Accordion, AccordionItem, AccordionTrigger, AccordionContent
- @/components/ui/alert: Alert, AlertTitle, AlertDescription
- @/components/ui/separator: Separator
- @/components/ui/scroll-area: ScrollArea
- @/components/ui/skeleton: Skeleton
- @/components/ui/table: Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- @/components/ui/dropdown-menu: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
- @/components/ui/sheet: Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle
- @/components/ui/avatar: Avatar, AvatarImage, AvatarFallback
- @/components/ui/calendar: Calendar
- @/components/ui/drawer: Drawer, DrawerTrigger, DrawerContent
- @/components/ui/toggle: Toggle
- @/components/ui/toggle-group: ToggleGroup, ToggleGroupItem
- @/components/ui/radio-group: RadioGroup, RadioGroupItem
- @/components/ui/textarea: Textarea
- @/components/ui/form: Form, FormField, FormItem, FormLabel, FormControl, FormMessage (react-hook-form)
- @/components/ui/chart: ChartContainer, ChartTooltip, ChartTooltipContent (recharts wrapper)
- @/components/ui/pagination: Pagination, PaginationContent, PaginationItem, PaginationLink

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
- recharts (LineChart, BarChart, PieChart, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer)
- date-fns (format, parseISO, addDays, differenceInDays, startOfWeek, etc.)
- zustand (create for complex state management)
- react-hook-form (useForm, Controller) + zod (z.string(), z.object() for validation)
- sonner (toast, toast.success, toast.error for notifications — add <Toaster /> in JSX)
- react-markdown (ReactMarkdown component for rendering markdown)
- canvas-confetti (confetti() for celebration effects)
- @dnd-kit/core + @dnd-kit/sortable (DndContext, SortableContext, useSortable for drag & drop)
- roughjs (rough.canvas() or rough.svg() for hand-drawn graphics)
- howler (new Howl({ src: [url] }) for sound effects)

## ADVANCED (use when specifically relevant)
- three (Three.js for 3D — large bundle, use only for 3D-focused apps)

## CODE QUALITY RULES
1. Use shadcn/ui components instead of raw HTML wherever a matching component exists
2. Never call hooks conditionally — all hooks at top of component
3. Handle edge cases: empty states, loading states, error boundaries
4. DARK MODE IS MANDATORY — the app must look perfect in both light and dark mode:
   - PREFER semantic classes that auto-adapt: text-foreground, bg-background, bg-card, text-muted-foreground, border-border
   - If using custom colors, ALWAYS pair with dark: variant: text-zinc-900 dark:text-zinc-100, bg-zinc-100 dark:bg-zinc-800
   - NEVER use bare text-black, bg-white, text-zinc-900, bg-gray-100, border-gray-200 without dark: counterpart
5. Use responsive classes (sm:, md:, lg:) for mobile-first design
6. Include ARIA labels on custom interactive elements
7. Use semantic HTML (main, section, nav, header, footer)
8. Keep state local — do not create React context for single-component apps
9. No inline styles — use Tailwind classes exclusively
10. Never use setTimeout/setInterval with functions that read React state — state will be stale. Pass computed values as arguments instead.
11. Limit icon imports to 6-8 icons maximum per component. Prefer semantic alternatives (text labels, colors, shapes) over additional icons.

Before writing code, mentally plan: key user interactions, state variables, visual hierarchy, and which shadcn/ui components to use.`;

export function buildUserPrompt(topic: string): string {
  return `Build an interactive app for: "/create/${topic}"

Interpret this path as user intent. Examples:
- "cooking/pasta" → Interactive recipe browser with cooking timers
- "games/tictactoe" → Fully playable Tic-Tac-Toe with AI opponent
- "tools/calculator" → Beautiful scientific calculator
- "finance/mortgage" → Mortgage calculator with amortization chart
- "fitness/timer" → Workout interval timer with presets

Respond with JSON: { title, description, code, relatedApps }
- code: raw string (no markdown fences), single default-exported React component
- relatedApps: 3-5 related paths without "/create/" prefix`;
}

function cleanCode(code: string): string {
  return code.replace(/^```tsx?/, "").replace(/^```/, "").replace(/```$/, "").trim();
}

export async function generateAppContent(
  path: string[],
): Promise<GenerationResult> {
  const topic = path.join("/");

  try {
    const result = await generateStructuredResponse<GeneratedAppContent>({
      prompt: buildUserPrompt(topic),
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 4096,
      temperature: 0.5,
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
    return { content: null, rawCode: null, error: message };
  }
}
