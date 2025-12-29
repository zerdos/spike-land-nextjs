"use client";

import { cn } from "@/lib/utils";
import { Check, Info, ShieldCheck, X } from "lucide-react";
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
    <div className="space-y-6 mb-12">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
          {title}
        </h1>
        <p className="text-xl text-muted-foreground/90 max-w-3xl leading-relaxed">
          {description}
        </p>
      </div>
      {usage && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 text-primary-text text-base flex gap-4 items-start shadow-sm">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium opacity-90">{usage}</p>
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
  donts?: string[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
      <div className="space-y-4 p-6 rounded-2xl bg-success/5 border border-success/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Check className="w-24 h-24 text-success" />
        </div>
        <div className="flex items-center gap-2 text-success relative z-10">
          <div className="p-1 rounded-full bg-success/10 border border-success/20">
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>
          <h3 className="font-bold uppercase tracking-wider text-xs">Do</h3>
        </div>
        <ul className="space-y-3 relative z-10">
          {dos.map((item, i) => (
            <li key={i} className="text-sm text-foreground/90 flex gap-3 items-start">
              <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      {donts && donts.length > 0 && (
        <div className="space-y-4 p-6 rounded-2xl bg-destructive/5 border border-destructive/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <X className="w-24 h-24 text-destructive" />
          </div>
          <div className="flex items-center gap-2 text-destructive relative z-10">
            <div className="p-1 rounded-full bg-destructive/10 border border-destructive/20">
              <X className="h-4 w-4" strokeWidth={3} />
            </div>
            <h3 className="font-bold uppercase tracking-wider text-xs">Don't</h3>
          </div>
          <ul className="space-y-3 relative z-10">
            {donts.map((item, i) => (
              <li key={i} className="text-sm text-foreground/90 flex gap-3 items-start">
                <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AccessibilityPanel({
  notes,
}: {
  notes: string[];
}) {
  return (
    <div className="my-10 p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 space-y-4 relative overflow-hidden">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="h-5 w-5" />
        <h3 className="font-bold uppercase tracking-wider text-xs font-heading">
          Accessibility (WCAG AA)
        </h3>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
        {notes.map((note, i) => (
          <li
            key={i}
            className="text-sm text-muted-foreground flex gap-3 items-start opacity-90 group hover:opacity-100 transition-opacity"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 group-hover:scale-125 transition-transform" />
            <span className="leading-snug">{note}</span>
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
    <div className={cn("space-y-4 group/sample", className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-bold font-heading group-hover/sample:text-primary transition-colors duration-300">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      <div className="p-8 md:p-12 rounded-3xl border border-border/50 bg-background/50 backdrop-blur-sm flex items-center justify-center min-h-[200px] shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="relative z-10 w-full flex justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
