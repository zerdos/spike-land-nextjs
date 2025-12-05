"use client";

import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: "portrait" | "landscape" | "product" | "architecture";
  originalUrl: string;
  enhancedUrl: string;
  width?: number;
  height?: number;
}

// Sample gallery items with placeholder images
const galleryItems: GalleryItem[] = [
  {
    id: "portrait-1",
    title: "Portrait Enhancement",
    description: "Skin smoothing and detail enhancement",
    category: "portrait",
    originalUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=70",
    enhancedUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=95",
    width: 3,
    height: 4,
  },
  {
    id: "landscape-1",
    title: "Landscape Upscaling",
    description: "4K resolution with enhanced colors",
    category: "landscape",
    originalUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=70",
    enhancedUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=95",
    width: 16,
    height: 9,
  },
  {
    id: "product-1",
    title: "Product Photo",
    description: "Crisp details for e-commerce",
    category: "product",
    originalUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=70",
    enhancedUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=95",
    width: 1,
    height: 1,
  },
  {
    id: "architecture-1",
    title: "Architecture Detail",
    description: "Sharp lines and textures",
    category: "architecture",
    originalUrl: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&q=70",
    enhancedUrl: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&q=95",
    width: 16,
    height: 10,
  },
  {
    id: "portrait-2",
    title: "Low Light Portrait",
    description: "Noise reduction and clarity",
    category: "portrait",
    originalUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=70",
    enhancedUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1200&q=95",
    width: 3,
    height: 4,
  },
  {
    id: "landscape-2",
    title: "Nature Scene",
    description: "Vibrant colors and detail",
    category: "landscape",
    originalUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=70",
    enhancedUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=95",
    width: 16,
    height: 9,
  },
];

const categories = [
  { value: "all", label: "All" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
  { value: "product", label: "Product" },
  { value: "architecture", label: "Architecture" },
];

export function BeforeAfterGallery() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredItems = activeCategory === "all"
    ? galleryItems
    : galleryItems.filter(item => item.category === activeCategory);

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
            {categories.map(category => (
              <TabsTrigger key={category.value} value={category.value}>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => (
            <TabsContent key={category.value} value={category.value}>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(category.value === "all" ? galleryItems : filteredItems).map(item => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <ImageComparisonSlider
                        originalUrl={item.originalUrl}
                        enhancedUrl={item.enhancedUrl}
                        width={item.width}
                        height={item.height}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
