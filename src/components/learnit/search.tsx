"use client";

import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { slugify } from "@/lib/learnit/utils";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function LearnItSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [results, setResults] = useState<{ slug: string; title: string; description: string }[]>(
    [],
  );
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => setIsFocused(false), 200);
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    async function search() {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/learnit/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.error(e);
      }
    }
    search();
  }, [debouncedQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const slug = slugify(query);
      router.push(`/learnit/${slug}`);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <motion.div
        animate={isFocused ? {
          boxShadow: [
            "0 0 20px rgba(16,185,129,0.15)",
            "0 0 40px rgba(16,185,129,0.25)",
            "0 0 20px rgba(16,185,129,0.15)",
          ],
        } : { boxShadow: "0 0 0px rgba(16,185,129,0)" }}
        transition={isFocused ? { duration: 2, repeat: Infinity } : { duration: 0.3 }}
        className="rounded-2xl"
      >
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 pointer-events-none" />
          <input
            data-testid="learnit-search-input"
            className="w-full rounded-2xl bg-zinc-900/50 backdrop-blur-xl text-white placeholder:text-zinc-500 border-2 border-transparent focus:border-emerald-400/50 pl-12 pr-32 py-5 text-lg focus:outline-none transition-all shadow-lg"
            placeholder="What do you want to learn today?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white rounded-lg"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl"
            >
              Go
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Autocomplete Dropdown */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          <div className="p-2 space-y-1">
            {results.map((result) => (
              <Button
                key={result.slug}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-white/5 rounded-xl transition-colors"
                onClick={() => router.push(`/learnit/${result.slug}`)}
              >
                <div className="w-full">
                  <div className="font-medium text-emerald-400">{result.title}</div>
                  <div className="text-xs text-zinc-400 truncate mt-0.5">{result.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
