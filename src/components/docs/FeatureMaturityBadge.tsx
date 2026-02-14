import { cn } from "@/lib/utils";

interface FeatureMaturityBadgeProps {
  maturity: "stable" | "beta" | "experimental";
}

const maturityStyles: Record<FeatureMaturityBadgeProps["maturity"], string> = {
  stable: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  beta: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  experimental: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export function FeatureMaturityBadge({ maturity }: FeatureMaturityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        maturityStyles[maturity],
      )}
    >
      {maturity}
    </span>
  );
}
