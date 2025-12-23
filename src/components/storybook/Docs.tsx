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
    <div className="space-y-4 mb-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">{title}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
      {usage && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-primary-text text-sm flex gap-3 items-start">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
      <div className="space-y-4 p-6 rounded-2xl bg-success/5 border border-success/20">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <h3 className="font-bold uppercase tracking-wider text-xs">Do</h3>
        </div>
        <ul className="space-y-2">
          {dos.map((item, i) => (
            <li key={i} className="text-sm text-foreground/80 flex gap-2">
              <span className="text-success font-bold">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-4 p-6 rounded-2xl bg-destructive/5 border border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <h3 className="font-bold uppercase tracking-wider text-xs">Don't</h3>
        </div>
        <ul className="space-y-2">
          {donts.map((item, i) => (
            <li key={i} className="text-sm text-foreground/80 flex gap-2">
              <span className="text-destructive font-bold">•</span>
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
    <div className="my-10 p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="h-5 w-5" />
        <h3 className="font-bold uppercase tracking-wider text-xs font-heading">
          Accessibility (WCAG AA)
        </h3>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        {notes.map((note, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2 items-start">
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
    <div className={cn("space-y-6", className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-bold font-heading">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="p-10 rounded-3xl border border-white/5 bg-white/2 backdrop-blur-sm flex items-center justify-center min-h-[200px] glass-1">
        {children}
      </div>
    </div>
  );
}
