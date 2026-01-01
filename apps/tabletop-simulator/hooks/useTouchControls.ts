"use client";
import { useState } from "react";

export type TouchMode = "camera" | "interaction";

export function useTouchControls() {
  const [mode, setMode] = useState<TouchMode>("camera");

  const toggleMode = () => setMode(p => p === "camera" ? "interaction" : "camera");

  return { mode, toggleMode };
}
