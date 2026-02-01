"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Point {
  x: number;
  y: number;
}

interface Connection {
  from: Point;
  to: Point;
  color?: string;
  dashed?: boolean;
}

interface FlowDiagramProps {
  connections: Connection[];
  className?: string;
  duration?: number;
}

export function FlowDiagram({ connections, className, duration = 1.5 }: FlowDiagramProps) {
  return (
    <div className={cn("relative w-full h-full pointer-events-none", className)}>
      <svg className="w-full h-full overflow-visible">
        {connections.map((conn, idx) => {
          // Calculate path
          // Simple curve logic: control point is midway X but flattened
          const midX = (conn.from.x + conn.to.x) / 2;

          // Bezier curve
          const d =
            `M ${conn.from.x} ${conn.from.y} C ${midX} ${conn.from.y}, ${midX} ${conn.to.y}, ${conn.to.x} ${conn.to.y}`;

          return (
            <motion.path
              key={idx}
              d={d}
              fill="none"
              stroke={conn.color || "rgba(255,255,255,0.2)"}
              strokeWidth="2"
              strokeDasharray={conn.dashed ? "5,5" : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: duration,
                delay: idx * 0.2,
                ease: "easeInOut",
              }}
              className="drop-shadow-sm"
            />
          );
        })}
      </svg>
    </div>
  );
}
