"use client";

import type { StoreApp } from "@/app/store/data/store-apps";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star } from "lucide-react";

import { getStoreIcon } from "./store-icon-map";
import { StoreMcpToolList } from "./store-mcp-tool-list";
import { StorePurchaseButton } from "./store-purchase-button";

interface StoreAppDetailDialogProps {
  app: StoreApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={
            i < Math.round(rating)
              ? "h-4 w-4 text-amber-400"
              : "h-4 w-4 text-zinc-600"
          }
          fill={i < Math.round(rating) ? "currentColor" : "none"}
        />
      ))}
      <span className="ml-1 text-sm text-zinc-400">{rating.toFixed(1)}</span>
    </div>
  );
}

export function StoreAppDetailDialog({
  app,
  open,
  onOpenChange,
}: StoreAppDetailDialogProps) {
  if (!app) return null;

  const IconComponent = getStoreIcon(app.icon);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <IconComponent className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <DialogTitle className="text-xl text-white">
                {app.name}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {app.tagline}
              </DialogDescription>
              <div className="flex items-center gap-3 pt-1">
                <Badge variant="outline">{app.category}</Badge>
                <StarRating rating={app.rating} />
                <span className="text-xs text-zinc-500">
                  ({app.reviewCount.toLocaleString()} reviews)
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Description */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">About</h3>
          <p className="text-sm leading-relaxed text-zinc-400">
            {app.longDescription}
          </p>
        </div>

        {/* Features Grid */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {app.features.map((feature) => {
              const FeatureIcon = getStoreIcon(feature.icon);
              return (
                <div
                  key={feature.title}
                  className="rounded-xl bg-white/5 p-4"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <FeatureIcon className="h-4 w-4 text-cyan-400" />
                  </div>
                  <h4 className="font-semibold text-white">{feature.title}</h4>
                  <p className="mt-1 text-sm text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* MCP Tools */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">MCP Tools</h3>
          <StoreMcpToolList tools={app.mcpTools} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-zinc-500">
            {app.installCount.toLocaleString()} installs
          </span>
          <StorePurchaseButton price={app.price} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
