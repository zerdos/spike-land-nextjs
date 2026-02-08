"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { AnimatePresence } from "framer-motion";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SkillsBar } from "./skills-bar";

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-/]/g, "");
}

export function CreateSearch() {
  const [query, setQuery] = useState("");
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<
    {
      type: "blocked" | "unclear";
      message: string;
    } | null
  >(null);
  const router = useRouter();
  const [results, setResults] = useState<{ slug: string; title: string; description: string; }[]>(
    [],
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch search results with abort controller to prevent race conditions
  useEffect(() => {
    const controller = new AbortController();

    async function search() {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/create/search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setResults(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error(e);
        }
      }
    }
    search();
    return () => controller.abort();
  }, [debouncedQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    if (results.length === 0) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [results.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isClassifying) return;

    setIsClassifying(true);
    setClassifyError(null);
    setResults([]);

    try {
      const res = await fetch("/api/create/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: query.trim() }),
      });

      if (!res.ok) {
        // API error — fallback to naive slug
        router.push(`/create/${slugify(query)}`);
        return;
      }

      const data = await res.json();

      if (data.status === "ok" && data.slug) {
        router.push(`/create/${data.slug}`);
      } else if (data.status === "blocked") {
        setClassifyError({
          type: "blocked",
          message: data.reason || "This topic is not allowed.",
        });
      } else if (data.status === "unclear") {
        setClassifyError({
          type: "unclear",
          message: data.reason || "Try describing what the app should do.",
        });
      } else {
        // Unexpected response — fallback
        router.push(`/create/${slugify(query)}`);
      }
    } catch {
      // Network error — fallback to naive slug
      router.push(`/create/${slugify(query)}`);
    } finally {
      setIsClassifying(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          data-testid="create-search-input"
          className="pl-10 py-6 text-lg shadow-sm"
          placeholder="Describe an app to create (e.g. 'todo list', 'color picker')"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (classifyError) setClassifyError(null);
          }}
          onBlur={() => {
            // Delay to allow click events on results to fire first
            setTimeout(() => setResults([]), 200);
          }}
        />
        <Button
          type="submit"
          className="absolute right-1.5 top-1.5 bottom-1.5"
          disabled={isClassifying}
        >
          {isClassifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
        </Button>
      </form>

      {classifyError && (
        <p
          className={`mt-2 text-sm ${
            classifyError.type === "blocked"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {classifyError.message}
        </p>
      )}

      <AnimatePresence>
        <SkillsBar query={debouncedQuery} />
      </AnimatePresence>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-md shadow-lg z-50 overflow-hidden">
          <div className="p-1">
            {results.map((result) => (
              <Button
                key={result.slug}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => {
                  setResults([]);
                  router.push(`/create/${result.slug}`);
                }}
              >
                <div>
                  <div className="font-medium">{result.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{result.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
