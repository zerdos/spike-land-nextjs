"use client";

import { useCallback, useEffect, useState } from "react";

interface Firework {
  id: number;
  x: number;
  y: number;
  color: string;
}

const COLORS = ["#00E5FF", "#FFD700", "#FF00FF", "#00FF00", "#FFFFFF"];

/**
 * Fireworks system that launches random explosions.
 * Only active during celebration mode to save CPU resources.
 */
export default function Fireworks(
  { isActive = false }: { isActive?: boolean; },
) {
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  const launch = useCallback(() => {
    const newFirework: Firework = {
      id: Date.now() + Math.random(),
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 60,
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#FFFFFF",
    };

    setFireworks((prev) => [...prev, newFirework]);

    setTimeout(() => {
      setFireworks((prev) => prev.filter((fw) => fw.id !== newFirework.id));
    }, 1500);
  }, []);

  // Only launch fireworks when in celebration mode
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      launch();
    }, 800);

    return () => clearInterval(timer);
  }, [isActive, launch]);

  // Don't render anything when not active
  if (!isActive && fireworks.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden transform-gpu">
      {fireworks.map((fw) => (
        <div
          key={fw.id}
          className="absolute flex items-center justify-center"
          style={{ left: `${fw.x}%`, top: `${fw.y}%` }}
        >
          {/* Central Burst */}
          <div
            className="h-1 w-1 rounded-full animate-firework-burst"
            style={{
              backgroundColor: fw.color,
              boxShadow: `0 0 40px 10px ${fw.color}`,
            }}
          />

          {/* Reduced particles from 12 to 6 */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full animate-firework-burst"
              style={{
                backgroundColor: fw.color,
                boxShadow: `0 0 10px ${fw.color}`,
                transform: `rotate(${i * 60}deg) translateY(-40px)`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
