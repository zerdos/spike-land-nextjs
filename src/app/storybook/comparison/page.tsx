"use client";

import { ComparisonViewToggle } from "@/components/enhance/ComparisonViewToggle";
import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Section } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ComparisonPage() {
  return (
    <div className="space-y-12">
      <Section
        title="Image Comparison"
        description="Before/after comparison components for showcasing image enhancements"
      >
        {/* Image Comparison Slider */}
        <Card>
          <CardHeader>
            <CardTitle>Image Comparison Slider</CardTitle>
            <CardDescription>
              Drag the handle to compare original and enhanced images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-2xl">
              <ImageComparisonSlider
                originalUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=60"
                enhancedUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=90&sat=20"
                originalLabel="Original"
                enhancedLabel="Enhanced"
                width={16}
                height={9}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Different Aspect Ratios
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Badge variant="outline">16:9</Badge>
                  <ImageComparisonSlider
                    originalUrl="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=225&fit=crop&q=60"
                    enhancedUrl="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=225&fit=crop&q=90&sat=20"
                    width={16}
                    height={9}
                  />
                </div>
                <div className="space-y-2">
                  <Badge variant="outline">4:3</Badge>
                  <ImageComparisonSlider
                    originalUrl="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&q=60"
                    enhancedUrl="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&q=90&sat=20"
                    width={4}
                    height={3}
                  />
                </div>
                <div className="space-y-2">
                  <Badge variant="outline">1:1</Badge>
                  <ImageComparisonSlider
                    originalUrl="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop&q=60"
                    enhancedUrl="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop&q=90&sat=20"
                    width={1}
                    height={1}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison View Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Comparison View Toggle</CardTitle>
            <CardDescription>
              Switch between different comparison modes: slider, side-by-side, or split view
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-3xl">
              <ComparisonViewToggle
                originalUrl="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&h=400&fit=crop&q=60"
                enhancedUrl="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&h=400&fit=crop&q=90&sat=20"
                width={16}
                height={9}
                defaultMode="slider"
              />
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
