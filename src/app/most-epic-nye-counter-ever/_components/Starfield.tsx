"use client";

import { useMemo } from "react";

/**
 * Animated deep space background with twinkling stars.
 * Uses useMemo to stabilize star positions on re-renders.
 */
export default function Starfield() {
  const stars = useMemo(() => {
    return Array.from({ length: 160 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 0.5,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${Math.random() * 5 + 3}s`,
      opacity: Math.random() * 0.5 + 0.3,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Background Gradients (Nebula Effect) */}
      <div className="absolute inset-0 bg-[#050510]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a0a2e_0%,transparent_70%)] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,#0a2e3a_0%,transparent_50%)] opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,#2e0a1a_0%,transparent_50%)] opacity-30" />

      {/* Twinkling Stars */}
      <div className="stars-container absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              top: star.top,
              left: star.left,
              opacity: star.opacity,
              animationDelay: star.delay,
              animationDuration: star.duration,
              boxShadow: star.size > 1.5 ? `0 0 4px 1px white` : "none",
            }}
          />
        ))}
      </div>

      {/* Drifting Nebula Particles (Subtle) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
    </div>
  );
}
