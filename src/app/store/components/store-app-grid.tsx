"use client";

import {
  StaggerContainer,
  StaggerItem,
} from "@/components/orbit-landing/ScrollReveal";

import type { StoreApp } from "@/app/store/data/store-apps";
import { StoreAppCard } from "./store-app-card";

interface StoreAppGridProps {
  apps: StoreApp[];
  onSelectApp: (app: StoreApp) => void;
}

export function StoreAppGrid({ apps, onSelectApp }: StoreAppGridProps) {
  if (apps.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-lg text-zinc-400">No apps in this category</p>
      </div>
    );
  }

  return (
    <StaggerContainer>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {apps.map((app) => (
          <StaggerItem key={app.id}>
            <StoreAppCard app={app} onSelect={onSelectApp} />
          </StaggerItem>
        ))}
      </div>
    </StaggerContainer>
  );
}
