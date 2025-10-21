import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export interface Feature {
  id: string
  icon?: LucideIcon | React.ReactNode
  title: string
  description: string
}

export interface AppFeatureListProps {
  features: Feature[]
  layout?: "grid" | "list"
  columns?: 1 | 2 | 3
  className?: string
}

export function AppFeatureList({
  features,
  layout = "grid",
  columns = 2,
  className
}: AppFeatureListProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
  }

  const containerClass = layout === "grid"
    ? cn("grid gap-6", gridCols[columns])
    : "space-y-6"

  if (features.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        No features available
      </div>
    )
  }

  return (
    <div className={cn(containerClass, className)}>
      {features.map((feature) => (
        <div
          key={feature.id}
          className={cn(
            "flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors",
            layout === "list" && "items-start"
          )}
        >
          {feature.icon && (
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {feature.icon}
            </div>
          )}
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-base leading-tight">
              {feature.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}