"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ThumbsUp } from "lucide-react";

interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpfulCount: number;
}

interface BazdmegFaqProps {
  onFaqExpanded?: () => void;
}

export function BazdmegFaq({ onFaqExpanded }: BazdmegFaqProps) {
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [helpedIds, setHelpedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/bazdmeg/faq")
      .then((res) => res.json())
      .then((data: { entries: FaqEntry[] }) => {
        setEntries(data.entries || []);
      })
      .catch(() => {
        // Silently fail - FAQ is non-critical
      })
      .finally(() => setLoading(false));
  }, []);

  const handleHelpful = useCallback(
    async (id: string) => {
      if (helpedIds.has(id)) return;
      setHelpedIds((prev) => new Set(prev).add(id));

      const res = await fetch(`/api/bazdmeg/faq/${id}/helpful`, {
        method: "POST",
      });
      if (res.ok) {
        const data = (await res.json()) as { helpfulCount: number };
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, helpfulCount: data.helpfulCount } : e,
          ),
        );
      }
    },
    [helpedIds],
  );

  // Group entries by category
  const categories = [...new Set(entries.map((e) => e.category))];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-white/10" />
        <Skeleton className="h-12 w-full bg-white/10" />
        <Skeleton className="h-12 w-full bg-white/10" />
        <Skeleton className="h-12 w-full bg-white/10" />
      </div>
    );
  }

  if (entries.length === 0) return null;

  const renderEntries = (items: FaqEntry[]) => (
    <Accordion type="multiple" className="w-full">
      {items.map((entry) => (
        <AccordionItem
          key={entry.id}
          value={entry.id}
          className="border-white/10"
        >
          <AccordionTrigger
            onClick={() => onFaqExpanded?.()}
            className="text-left text-white hover:text-amber-400 hover:no-underline"
          >
            {entry.question}
          </AccordionTrigger>
          <AccordionContent className="text-zinc-400">
            <p className="mb-3 leading-relaxed">{entry.answer}</p>
            <button
              onClick={() => handleHelpful(entry.id)}
              disabled={helpedIds.has(entry.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ${
                helpedIds.has(entry.id)
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
              }`}
            >
              <ThumbsUp className="h-3 w-3" />
              {helpedIds.has(entry.id) ? "Thanks!" : "Helpful"}{" "}
              {entry.helpfulCount > 0 && `(${entry.helpfulCount})`}
            </button>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  // If only one category, skip tabs
  if (categories.length <= 1) {
    return (
      <div>
        <h2 className="mb-8 text-center text-4xl font-bold text-white">
          Frequently Asked Questions
        </h2>
        <div className="mx-auto max-w-3xl">{renderEntries(entries)}</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-8 text-center text-4xl font-bold text-white">
        Frequently Asked Questions
      </h2>
      <div className="mx-auto max-w-3xl">
        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="mb-6 w-full justify-start bg-white/5">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="capitalize data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map((cat) => (
            <TabsContent key={cat} value={cat}>
              {renderEntries(entries.filter((e) => e.category === cat))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
