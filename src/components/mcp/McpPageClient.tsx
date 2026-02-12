"use client";

import { McpCategoryShowcase } from "@/components/mcp/McpCategoryShowcase";
import { McpHero } from "@/components/mcp/McpHero";
import { McpIntegrationGuide } from "@/components/mcp/McpIntegrationGuide";
import { McpPcdShowcase } from "@/components/mcp/McpPcdShowcase";
import { McpPlayground } from "@/components/mcp/McpPlayground";
import { useCallback, useRef, useState } from "react";

export function McpPageClient() {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const [initialCategory, setInitialCategory] = useState<string | undefined>();

  const scrollToPlayground = useCallback(() => {
    playgroundRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setInitialCategory(categoryId);
    playgroundRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleExploreClick = useCallback(() => {
    scrollToPlayground();
  }, [scrollToPlayground]);

  return (
    <main className="min-h-screen">
      <McpHero onExploreClick={handleExploreClick} />
      <McpPcdShowcase />
      <McpCategoryShowcase onCategorySelect={handleCategorySelect} />
      <div ref={playgroundRef} id="playground" className="scroll-mt-20">
        <McpPlayground initialCategory={initialCategory} />
      </div>
      <McpIntegrationGuide />
    </main>
  );
}
