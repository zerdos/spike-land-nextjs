"use client";

import { cn } from "@/lib/utils";

interface PixelLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "icon" | "horizontal" | "stacked";
  className?: string;
  showText?: boolean;
}

const sizeMap = {
  sm: { grid: 32, text: "text-lg", gap: "gap-2" },
  md: { grid: 48, text: "text-xl", gap: "gap-3" },
  lg: { grid: 64, text: "text-2xl", gap: "gap-3" },
  xl: { grid: 96, text: "text-4xl", gap: "gap-4" },
};

export function PixelLogo({
  size = "md",
  variant = "horizontal",
  className,
  showText = true,
}: PixelLogoProps) {
  const { grid, text, gap } = sizeMap[size];
  const cellSize = grid / 3;
  const cellGap = cellSize * 0.12;
  const cornerRadius = cellSize * 0.18;

  const GridIcon = () => (
    <svg
      width={grid}
      height={grid}
      viewBox={`0 0 ${grid} ${grid}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <defs>
        <filter id={`glow-${size}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`sparkGradient-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id={`sparkShine-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#00E5FF" stopOpacity="0" />
          <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const isCenter = row === 1 && col === 1;
          const x = col * cellSize + cellGap / 2;
          const y = row * cellSize + cellGap / 2;
          const rectSize = cellSize - cellGap;

          if (isCenter) {
            return (
              <g key={`${row}-${col}`}>
                <rect
                  x={x}
                  y={y}
                  width={rectSize}
                  height={rectSize}
                  rx={cornerRadius}
                  fill={`url(#sparkGradient-${size})`}
                  filter={`url(#glow-${size})`}
                />
                <rect
                  x={x}
                  y={y}
                  width={rectSize}
                  height={rectSize}
                  rx={cornerRadius}
                  fill={`url(#sparkShine-${size})`}
                />
              </g>
            );
          }

          return (
            <rect
              key={`${row}-${col}`}
              x={x}
              y={y}
              width={rectSize}
              height={rectSize}
              rx={cornerRadius}
              className="fill-[hsl(var(--grid-inactive))]"
            />
          );
        })
      )}
    </svg>
  );

  const Wordmark = () => (
    <span
      className={cn(
        "font-heading font-bold tracking-tight lowercase",
        text,
        "text-foreground",
      )}
    >
      pixel
    </span>
  );

  if (variant === "icon" || !showText) {
    return (
      <div className={cn("inline-flex items-center", className)} role="img" aria-label="Pixel logo">
        <GridIcon />
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div
        className={cn("inline-flex flex-col items-center gap-2", className)}
        role="img"
        aria-label="Pixel logo"
      >
        <GridIcon />
        <Wordmark />
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center", gap, className)}
      role="img"
      aria-label="Pixel logo"
    >
      <GridIcon />
      <Wordmark />
    </div>
  );
}
