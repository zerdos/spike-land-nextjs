"use client";

import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MASONRY_BREAKPOINTS_LANDING, MASONRY_CLASSES, MASONRY_ITEM_MARGIN } from "@/lib/canvas";
import { useState } from "react";
import Masonry from "react-masonry-css";

import type { GalleryItem } from "./gallery-fallback-data";

const categories = [
  { value: "all", label: "All" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
  { value: "product", label: "Product" },
  { value: "architecture", label: "Architecture" },
];

interface BeforeAfterGalleryClientProps {
  items: GalleryItem[];
}

export function BeforeAfterGalleryClient(
  { items }: BeforeAfterGalleryClientProps,
) {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredItems = activeCategory === "all"
    ? items
    : items.filter((item) => item.category === activeCategory);

  return (
    <section id="gallery" className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            See the Difference
          </h2>
          <p className="text-lg text-muted-foreground">
            Drag the slider to compare original and enhanced images. Our AI delivers stunning
            results across all image types.
          </p>
        </div>

        <Tabs
          value={activeCategory}
          onValueChange={setActiveCategory}
          className="mx-auto max-w-6xl"
        >
          <TabsList className="mx-auto mb-8 flex w-fit">
            {categories.map((category) => (
              <TabsTrigger key={category.value} value={category.value}>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.value} value={category.value}>
              <Masonry
                breakpointCols={MASONRY_BREAKPOINTS_LANDING}
                className={MASONRY_CLASSES.container}
                columnClassName={MASONRY_CLASSES.column}
              >
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`${MASONRY_ITEM_MARGIN} overflow-hidden transition-all duration-300 hover:shadow-glow-cyan-sm hover:border-primary/30 group`}
                  >
                    <CardContent className="p-0">
                      <ImageComparisonSlider
                        originalUrl={item.originalUrl}
                        enhancedUrl={item.enhancedUrl}
                        width={item.width}
                        height={item.height}
                      />
                    </CardContent>
                  </Card>
                ))}
              </Masonry>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
