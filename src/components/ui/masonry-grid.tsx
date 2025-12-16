"use client";

import { cn } from "@/lib/utils";
import { Children, ReactNode, useMemo } from "react";

export type ZoomLevel = 1 | 2 | 3 | 4 | 5;

interface MasonryGridProps {
  children: ReactNode;
  zoomLevel?: ZoomLevel;
  className?: string;
}

// Column counts based on zoom level and breakpoint
// Higher zoom = fewer columns (bigger items)
const COLUMN_CONFIG: Record<ZoomLevel, { sm: number; md: number; lg: number; xl: number; }> = {
  1: { sm: 4, md: 5, lg: 6, xl: 8 }, // Smallest items, most columns
  2: { sm: 3, md: 4, lg: 5, xl: 6 },
  3: { sm: 2, md: 3, lg: 4, xl: 5 }, // Default
  4: { sm: 2, md: 2, lg: 3, xl: 4 },
  5: { sm: 1, md: 2, lg: 2, xl: 3 }, // Largest items, fewest columns
};

export function MasonryGrid({
  children,
  zoomLevel = 3,
  className,
}: MasonryGridProps) {
  const childArray = Children.toArray(children);
  const config = COLUMN_CONFIG[zoomLevel];

  // Memoize column classes based on zoom level
  const columnClasses = useMemo(() => {
    return cn(
      "columns-1",
      config.sm > 1 && `sm:columns-${config.sm}`,
      config.md > 1 && `md:columns-${config.md}`,
      config.lg > 1 && `lg:columns-${config.lg}`,
      config.xl > 1 && `xl:columns-${config.xl}`,
    );
  }, [config]);

  return (
    <div
      className={cn(
        // Use CSS columns for masonry effect
        columnClasses,
        "gap-4 space-y-4",
        className,
      )}
      style={{
        columnGap: "1rem",
      }}
    >
      {childArray.map((child, index) => (
        <div
          key={index}
          className="break-inside-avoid mb-4"
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// Grid-based variant for when aspect ratios are uniform
export function MasonryGridUniform({
  children,
  zoomLevel = 3,
  className,
}: MasonryGridProps) {
  const config = COLUMN_CONFIG[zoomLevel];

  // Build responsive grid classes
  const gridClasses = cn(
    "grid gap-4",
    `grid-cols-1`,
    config.sm > 1 && `sm:grid-cols-${config.sm}`,
    config.md > 1 && `md:grid-cols-${config.md}`,
    config.lg > 1 && `lg:grid-cols-${config.lg}`,
    config.xl > 1 && `xl:grid-cols-${config.xl}`,
  );

  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  );
}
