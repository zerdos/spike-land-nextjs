"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

interface IconCarouselProps {
  icons: React.ReactNode[];
  className?: string;
  speed?: number; // seconds for full duration
}

export function IconCarousel({ icons, className, speed = 20 }: IconCarouselProps) {
  return (
    <div className={cn("relative w-full overflow-hidden mask-fade-sides", className)}>
      <motion.div
        className="flex gap-12 w-max items-center"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {/* Double the icons to create seamless loop */}
        {[...icons, ...icons].map((icon, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-300"
          >
            {icon}
          </div>
        ))}
      </motion.div>
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none" />
    </div>
  );
}
