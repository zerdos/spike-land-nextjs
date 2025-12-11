export type CanvasRotation = 0 | 90 | 180 | 270;
export type CanvasOrder = "album" | "random";

export interface CanvasSettings {
  rotation: CanvasRotation;
  order: CanvasOrder;
  interval: number;
}

export interface CanvasImage {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
}
