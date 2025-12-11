import type { CanvasOrder, CanvasRotation } from "./types";

export const DEFAULT_INTERVAL = 10;
export const MIN_INTERVAL = 5;
export const MAX_INTERVAL = 60;
export const ROTATION_OPTIONS: CanvasRotation[] = [0, 90, 180, 270];
export const DEFAULT_ROTATION: CanvasRotation = 0;
export const DEFAULT_ORDER: CanvasOrder = "album";
