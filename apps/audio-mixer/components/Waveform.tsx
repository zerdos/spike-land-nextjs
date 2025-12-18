/**
 * Waveform Component - Visual display of audio waveform
 * Resolves #332
 */

"use client";

import { useEffect, useRef } from "react";
import { drawWaveform } from "../lib/audio-engine";
import type { WaveformOptions } from "../types";

interface WaveformProps {
  data: number[];
  progress: number;
  width?: number;
  height?: number;
  barColor?: string;
  progressColor?: string;
  onClick?: (progress: number) => void;
}

export function Waveform({
  data,
  progress,
  width = 300,
  height = 60,
  barColor = "#4b5563",
  progressColor = "#3b82f6",
  onClick,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const options: WaveformOptions = {
      width,
      height,
      barWidth: Math.max(2, Math.floor(width / data.length) - 1),
      barGap: 1,
      barColor,
      progressColor,
    };

    drawWaveform(canvas, data, progress, options);
  }, [data, progress, width, height, barColor, progressColor]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onClick || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickProgress = x / width;
    onClick(Math.max(0, Math.min(1, clickProgress)));
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      className={onClick ? "cursor-pointer" : ""}
      aria-label="Audio waveform visualization"
    />
  );
}
