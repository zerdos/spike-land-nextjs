"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Info, ShieldCheck, XCircle } from "lucide-react";
import type React from "react";

export function PageHeader({
  title,
  description,
  usage,
}: {
  title: string;
  description: string;
  usage?: string;
}) {
  return (
    <div className="space-y-3 mb-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-heading tracking-tight text-foreground">{title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
      {usage && (
        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-primary-text text-sm flex gap-3 items-start">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{usage}</p>
        </div>
      )}
    </div>
  );
}

export function UsageGuide({
  dos,
  donts,
}: {
  dos: string[];
  donts: string[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
      <div className="space-y-3 p-5 rounded-2xl bg-success/5 border border-success/20">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <h3 className="font-bold uppercase tracking-wider text-[10px]">Do</h3>
        </div>
        <ul className="space-y-1.5">
          {dos.map((item, i) => (
            <li key={i} className="text-sm text-foreground/80 flex gap-2">
              <span className="text-success font-bold text-xs">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3 p-5 rounded-2xl bg-destructive/5 border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-4 w-4" />
          <h3 className="font-bold uppercase tracking-wider text-[10px]">Don't</h3>
        </div>
        <ul className="space-y-1.5">
          {donts.map((item, i) => (
            <li key={i} className="text-sm text-foreground/80 flex gap-2">
              <span className="text-destructive font-bold text-xs">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AccessibilityPanel({
  notes,
}: {
  notes: string[];
}) {
  return (
    <div className="my-8 p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="h-4 w-4" />
        <h3 className="font-bold uppercase tracking-wider text-[10px] font-heading">
          Accessibility (WCAG AA)
        </h3>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
        {notes.map((note, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2 items-start opacity-90">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComponentSample({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-0.5">
        <h3 className="text-base font-bold font-heading">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="p-8 rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm flex items-center justify-center min-h-[160px] glass-1 shadow-inner">
        {children}
      </div>
    </div>
  );
}
