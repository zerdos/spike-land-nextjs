"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SyncingOverlayProps {
  isSyncing: boolean;
  flashKey: number;
}

export function SyncingOverlay({ isSyncing, flashKey }: SyncingOverlayProps) {
  const [glitchActive, setGlitchActive] = useState(false);

  // Trigger random glitch bursts while syncing
  useEffect(() => {
    if (!isSyncing) {
      setGlitchActive(false);
      return;
    }

    const triggerGlitch = () => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    };

    // Initial glitch
    triggerGlitch();

    // Random glitches every 500-1500ms
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        triggerGlitch();
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isSyncing, flashKey]);

  return (
    <AnimatePresence>
      {isSyncing && (
        <>
          {/* Animated border */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 pointer-events-none rounded-xl"
            style={{
              background: `linear-gradient(90deg,
                transparent 0%,
                rgba(20, 184, 166, 0.8) 25%,
                rgba(168, 85, 247, 0.8) 50%,
                rgba(20, 184, 166, 0.8) 75%,
                transparent 100%)`,
              backgroundSize: "200% 100%",
              animation: "borderFlow 1.5s linear infinite",
              padding: "2px",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          {/* Blur + Scanline overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: glitchActive ? 0.6 : 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 z-30 pointer-events-none rounded-xl overflow-hidden"
            style={{
              backdropFilter: glitchActive ? "blur(2px)" : "blur(0.5px)",
              background: glitchActive
                ? "repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)"
                : "transparent",
            }}
          />

          {/* Glitch displacement effect */}
          {glitchActive && (
            <motion.div
              initial={{ x: -3 }}
              animate={{ x: 3 }}
              transition={{ duration: 0.05, repeat: 2, repeatType: "reverse" }}
              className="absolute inset-0 z-20 pointer-events-none rounded-xl overflow-hidden"
              style={{
                mixBlendMode: "difference",
                background:
                  "linear-gradient(90deg, transparent 40%, rgba(255,0,0,0.1) 50%, transparent 60%)",
              }}
            />
          )}

          {/* "AI Working" indicator badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full bg-teal-500/90 backdrop-blur-sm shadow-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-medium text-white">
                AI Updating...
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
