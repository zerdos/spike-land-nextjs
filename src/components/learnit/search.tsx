"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
// If useDebounce doesn't exist, I'll inline it.

export function LearnItSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [results, setResults] = useState<{ slug: string; title: string; description: string; }[]>(
    [],
  );
  // const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    async function search() {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }
      // setLoading(true);
      try {
        const res = await fetch(`/api/learnit/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.error(e);
      } finally {
        // setLoading(false);
      }
    }
    search();
  }, [debouncedQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Direct navigation to topic if it looks like a path or just search
      // For now, let's just go to the first result or generate path
      const slug = query.toLowerCase().replace(/\s+/g, "-");
      router.push(`/learnit/${slug}`);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          data-testid="learnit-search-input"
          className="pl-10 py-6 text-lg shadow-sm"
          placeholder="What do you want to learn today? (e.g. 'React Hooks')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5">
          Go
        </Button>
      </form>

      {/* Autocomplete Dropdown */}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-md shadow-lg z-50 overflow-hidden">
          <div className="p-1">
            {results.map((result) => (
              <Button
                key={result.slug}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => router.push(`/learnit/${result.slug}`)}
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
