"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Star } from "lucide-react";

import type { StoreApp } from "@/app/store/data/store-apps";
import { getStoreIcon } from "./store-icon-map";

interface StoreAppCardProps {
  app: StoreApp;
  onSelect: (app: StoreApp) => void;
}

export function StoreAppCard({ app, onSelect }: StoreAppCardProps) {
  const IconComponent = getStoreIcon(app.icon);

  return (
    <Card
      variant={app.cardVariant}
      onClick={() => onSelect(app)}
      className="cursor-pointer hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
    >
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{app.name}</h3>
            <p className="text-sm opacity-80">{app.tagline}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Badge variant="outline" className="border-white/20">
            {app.mcpTools.length} MCP Tools
          </Badge>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">${app.price}</span>
            <Badge variant="secondary">Free with Orbit</Badge>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < Math.round(app.rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-white/20"
                  }`}
                />
              ))}
            </div>
            <span className="opacity-80">
              {app.rating} ({app.reviewCount.toLocaleString()})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
