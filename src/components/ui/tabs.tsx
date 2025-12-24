"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({
    left: 0,
    top: 4,
    width: 0,
    height: "calc(100% - 8px)",
    opacity: 0,
  });

  const listRef = React.useRef<HTMLDivElement>(null);

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const activeTrigger = list.querySelector('[data-state="active"]') as HTMLElement;
    if (activeTrigger) {
      setIndicatorStyle({
        left: activeTrigger.offsetLeft,
        top: activeTrigger.offsetTop,
        width: activeTrigger.offsetWidth,
        height: activeTrigger.offsetHeight,
        opacity: 1,
      });
    }
  }, []);

  React.useEffect(() => {
    updateIndicator();
    // Re-calculate on window resize
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  // We need to re-run updateIndicator when the value changes.
  // We can use a MutationObserver to detect when [data-state="active"] moves.
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-state"
        ) {
          updateIndicator();
        }
      });
    });

    observer.observe(list, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-state"],
    });

    return () => observer.disconnect();
  }, [updateIndicator]);

  return (
    <TabsPrimitive.List
      ref={(node) => {
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<typeof node>).current = node;
        (listRef as React.MutableRefObject<typeof node>).current = node;
      }}
      className={cn(
        "relative inline-flex h-11 items-center justify-center rounded-xl bg-muted/30 p-1 text-muted-foreground/60 glass-0",
        className,
      )}
      {...props}
    >
      {/* Animated Background Indicator */}
      <div
        aria-hidden="true"
        className="absolute z-0 rounded-lg bg-white/10 shadow-[0_0_15px_rgba(0,229,255,0.15)] transition-all duration-300 ease-in-out pointer-events-none glass-edge"
        style={indicatorStyle}
      />
      {props.children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground/30 data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in-50 duration-300",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
