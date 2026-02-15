"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { STORE_CATEGORIES } from "@/app/store/data/store-apps";

interface StoreCategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function StoreCategoryTabs({
  selectedCategory,
  onCategoryChange,
}: StoreCategoryTabsProps) {
  return (
    <Tabs value={selectedCategory} onValueChange={onCategoryChange}>
      <TabsList>
        {STORE_CATEGORIES.map((category) => (
          <TabsTrigger key={category.id} value={category.id}>
            {category.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
