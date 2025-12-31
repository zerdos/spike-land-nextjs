"use client";

import { useEffect, useState } from "react";

interface Star {
  id: number;
  startX: number;
  startY: number;
  duration: number;
}

/**
 * Occasional shooting stars - very CPU efficient
 * Only renders one star at a time, every 8-15 seconds
 */
export default function ShootingStar() {
  const [star, setStar] = useState<Star | null>(null);

  useEffect(() => {
    const launchStar = () => {
      const newStar: Star = {
        id: Date.now(),
        startX: 10 + Math.random() * 60, // Start from top 10-70% of screen
        startY: Math.random() * 30, // Top 30% of screen
        duration: 1 + Math.random() * 0.5, // 1-1.5s animation
      };
      setStar(newStar);

      // Remove after animation
      setTimeout(() => setStar(null), newStar.duration * 1000 + 100);
    };

    // Initial delay
    const initialDelay = setTimeout(launchStar, 3000);

    // Launch a new star every 8-15 seconds
    const interval = setInterval(() => {
      launchStar();
    }, 8000 + Math.random() * 7000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  if (!star) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
      <div
        className="absolute w-1 h-1 bg-white rounded-full animate-shooting-star"
        style={{
          left: `${star.startX}%`,
          top: `${star.startY}%`,
          animationDuration: `${star.duration}s`,
          boxShadow: "0 0 6px 2px white, 0 0 12px 4px rgba(255,255,255,0.5)",
        }}
      />
    </div>
  );
}
