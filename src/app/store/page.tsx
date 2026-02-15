"use client";

import { useState } from "react";
import { StoreHero } from "./components/store-hero";
import { StoreCategoryTabs } from "./components/store-category-tabs";
import { StoreAppGrid } from "./components/store-app-grid";
import { StoreAppDetailDialog } from "./components/store-app-detail-dialog";
import { getAppsByCategory } from "./data/store-apps";
import type { StoreApp } from "./data/store-apps";
import { ScrollReveal } from "@/components/orbit-landing/ScrollReveal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function StorePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedApp, setSelectedApp] = useState<StoreApp | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelectApp = (app: StoreApp) => {
    setSelectedApp(app);
    setDialogOpen(true);
  };

  const filteredApps = getAppsByCategory(selectedCategory);

  return (
    <div className="text-white">
      <StoreHero />

      {/* Category Tabs + Grid Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <ScrollReveal>
            <div className="flex justify-center mb-10">
              <StoreCategoryTabs
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </ScrollReveal>

          <StoreAppGrid
            apps={filteredApps}
            onSelectApp={handleSelectApp}
          />
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 border-t border-white/5">
        <ScrollReveal>
          <div className="container mx-auto px-6 text-center max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">
              Looking for Claude Code skills?
            </h2>
            <p className="text-zinc-400 mb-8">
              Browse our collection of AI-powered development skills for quality gates, testing, and workflow automation.
            </p>
            <Button asChild variant="outline" size="lg">
              <Link href="/store/skills" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Browse Skills
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </section>

      {/* Detail Dialog */}
      <StoreAppDetailDialog
        app={selectedApp}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
