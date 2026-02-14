"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, getCategoryLabel } from "./CategoryFilter";
import { SkillCard } from "./SkillCard";

interface SkillData {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  category: string;
  color: string | null;
  installCount: number;
  isFeatured: boolean;
  tags: string[];
}

interface SkillCatalogProps {
  skills: SkillData[];
}

export function SkillCatalog({ skills }: SkillCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const filteredSkills = activeCategory === "ALL"
    ? skills
    : skills.filter((skill) => skill.category === activeCategory);

  // Sort featured skills first
  const sortedSkills = [...filteredSkills].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return b.installCount - a.installCount;
  });

  return (
    <div className="space-y-8">
      <Tabs
        value={activeCategory}
        onValueChange={setActiveCategory}
        className="w-full"
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          {CATEGORIES.map((category) => (
            <TabsTrigger key={category} value={category}>
              {getCategoryLabel(category)}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((category) => (
          <TabsContent key={category} value={category}>
            {/* Content is rendered below via sortedSkills, TabsContent just handles visibility */}
          </TabsContent>
        ))}
      </Tabs>

      {sortedSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No skills found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            No skills match the selected category. Try selecting a different filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSkills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
