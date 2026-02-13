"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Headphones, Loader2, Pause, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface DisciplineConfig {
  slug: string;
  discipline: string;
  thinker: string;
  tagline: string;
  voiceId: string;
  gradient: string;
}

const DISCIPLINES: DisciplineConfig[] = [
  {
    slug: "testing-shadows-on-the-cave-wall",
    discipline: "Philosophy",
    thinker: "Socrates",
    tagline: "Shadows on the cave wall",
    voiceId: "nPczCjzI2devNBz1zQrb", // Brian - deep, contemplative male
    gradient: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30",
  },
  {
    slug: "the-wrong-question-we-answered-for-thirty-years",
    discipline: "Cognitive Science",
    thinker: "Kahneman",
    tagline: "The substitution heuristic",
    voiceId: "onwK4e9ZLuTAKqWW03F9", // Daniel - precise, analytical
    gradient: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
  },
  {
    slug: "the-transaction-cost-of-clicking-a-button",
    discipline: "Economics",
    thinker: "Hayek",
    tagline: "Transaction costs collapsed to zero",
    voiceId: "N2lVS1w4EtoT3dr4eOWO", // Callum - authoritative, measured
    gradient: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
  },
  {
    slug: "load-bearing-walls-and-curtain-walls",
    discipline: "Architecture",
    thinker: "Palladio",
    tagline: "Load-bearing walls and curtain walls",
    voiceId: "CwhRBWXzGAHq8TQ4Fs17", // Roger - warm, descriptive
    gradient: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
  },
  {
    slug: "figured-bass-and-the-art-of-testing",
    discipline: "Music Theory",
    thinker: "Bach",
    tagline: "Figured bass and counterpoint",
    voiceId: "iP95p4xoKVk53GoZ742B", // Chris - elegant, cultured
    gradient: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
  },
];

interface PostContent {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  plainText: string;
}

type ReaderState = "idle" | "loading" | "playing" | "paused";

function DisciplineArticleReader({
  plainText,
  voiceId,
  thinker,
}: {
  plainText: string;
  voiceId: string;
  thinker: string;
}) {
  const [state, setState] = useState<ReaderState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalParagraphs, setTotalParagraphs] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);
  const paragraphsRef = useRef<string[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const getParagraphs = useCallback((): string[] => {
    return plainText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length >= 20);
  }, [plainText]);

  const fetchUrl = useCallback(async (text: string): Promise<string> => {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("audio/")) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }

    const data = await response.json();
    return data.url;
  }, [voiceId]);

  const playParagraph = useCallback(async (index: number, texts: string[]) => {
    if (!mountedRef.current || index >= texts.length) {
      if (mountedRef.current) {
        setState("idle");
        setCurrentIndex(0);
      }
      return;
    }

    if (mountedRef.current) {
      setState("loading");
      setCurrentIndex(index);
    }

    try {
      if (index + 1 < texts.length) {
        fetchUrl(texts[index + 1]!).catch(() => {});
      }

      const url = await fetchUrl(texts[index]!);
      if (!mountedRef.current) return;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("ended", () => {
        audioRef.current = null;
        if (mountedRef.current) {
          playParagraph(index + 1, texts);
        }
      });

      audio.addEventListener("error", () => {
        audioRef.current = null;
        if (mountedRef.current) {
          playParagraph(index + 1, texts);
        }
      });

      if (!mountedRef.current) return;
      setState("playing");
      await audio.play();
    } catch {
      if (mountedRef.current) {
        playParagraph(index + 1, texts);
      }
    }
  }, [fetchUrl]);

  const handlePlay = useCallback(() => {
    if (state === "playing" || state === "loading") {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setState("paused");
      return;
    }

    if (state === "paused" && audioRef.current) {
      setState("playing");
      audioRef.current.play();
      return;
    }

    const texts = getParagraphs();
    if (texts.length === 0) return;

    paragraphsRef.current = texts;
    setTotalParagraphs(texts.length);
    playParagraph(0, texts);
  }, [state, getParagraphs, playParagraph]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState("idle");
    setCurrentIndex(0);
  }, []);

  const isActive = state !== "idle";
  const progress = totalParagraphs > 0
    ? ((currentIndex + 1) / totalParagraphs) * 100
    : 0;

  return (
    <div className="flex items-center gap-3 my-4">
      <button
        type="button"
        onClick={handlePlay}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all",
          "border border-border hover:border-primary/50",
          "text-muted-foreground hover:text-foreground",
          isActive && "border-primary/50 text-primary",
        )}
        aria-label={
          state === "playing"
            ? "Pause reading"
            : state === "paused"
            ? "Resume reading"
            : `Listen with ${thinker}'s voice`
        }
      >
        {state === "loading"
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : state === "playing"
          ? <Pause className="h-4 w-4" />
          : <Headphones className="h-4 w-4" />}
        <span>
          {state === "idle"
            ? `Listen with ${thinker}'s voice`
            : state === "loading"
            ? "Loading..."
            : state === "paused"
            ? "Paused"
            : `${currentIndex + 1} / ${totalParagraphs}`}
        </span>
      </button>

      {isActive && (
        <>
          <button
            type="button"
            onClick={handleStop}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Stop reading"
          >
            <Square className="h-3.5 w-3.5" />
          </button>

          <div className="flex-1 max-w-32 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function DisciplineCardShowcase() {
  const [posts, setPosts] = useState<PostContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineConfig | null>(null);

  useEffect(() => {
    const slugs = DISCIPLINES.map(d => d.slug).join(",");

    fetch(`/api/blog/content?slugs=${slugs}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load discipline posts");
        return res.json();
      })
      .then(data => {
        setPosts(data.posts);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const selectedPost = selectedDiscipline
    ? posts.find(p => p.slug === selectedDiscipline.slug)
    : null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-8" data-testid="discipline-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8 p-6 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive" data-testid="discipline-error">
        Failed to load discipline posts: {error}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-8" data-testid="discipline-grid">
        {DISCIPLINES.map((discipline, index) => (
          <motion.button
            key={discipline.slug}
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            onClick={() => setSelectedDiscipline(discipline)}
            className={cn(
              "group relative p-6 rounded-xl border bg-gradient-to-br text-left transition-all",
              "hover:scale-[1.02] hover:shadow-lg",
              discipline.gradient,
            )}
            aria-label={`Read ${discipline.discipline} perspective`}
          >
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              {discipline.discipline}
            </div>
            <div className="text-lg font-heading font-semibold text-foreground mb-1">
              {discipline.thinker}
            </div>
            <div className="text-sm text-muted-foreground">
              {discipline.tagline}
            </div>
          </motion.button>
        ))}
      </div>

      <Dialog open={!!selectedDiscipline} onOpenChange={(open) => !open && setSelectedDiscipline(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {selectedDiscipline?.discipline}: {selectedDiscipline?.thinker}
            </DialogTitle>
            <DialogDescription>
              {selectedDiscipline?.tagline}
            </DialogDescription>
          </DialogHeader>

          {selectedPost && selectedDiscipline && (
            <div className="mt-4">
              <DisciplineArticleReader
                plainText={selectedPost.plainText}
                voiceId={selectedDiscipline.voiceId}
                thinker={selectedDiscipline.thinker}
              />

              <div className="prose prose-sm dark:prose-invert max-w-none mt-6">
                {selectedPost.plainText.split(/\n\n+/).map((paragraph, i) => (
                  <p key={i} className="text-foreground leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
