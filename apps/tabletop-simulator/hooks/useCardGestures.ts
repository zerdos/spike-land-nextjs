import { ThreeEvent } from "@react-three/fiber";
import { useDrag } from "@use-gesture/react";
import { Vector3 } from "three";

export function useCardGestures(
  id: string,
  onMove: (id: string, pos: { x: number; y: number; z: number; }) => void,
  onFlip: (id: string) => void,
) {
  // Simple tap detection
  const bind = useDrag(({ active, movement: [x, y], timeStamp, event, tap }) => {
    // Cast event to ThreeEvent to access 3D point
    const e = event as unknown as ThreeEvent<PointerEvent>;
    e.stopPropagation();

    if (tap) {
      onFlip(id);
      return;
    }

    if (active) {
      // In a real implementation, we'd use the point from the event raycast
      // But event.point is the point on the object itself usually.
      // To drag properly, we need a floor plane raycast.
      // For MVP, simple logic:
      const point = e.point;
      // We assume dragging on table surface (y~0)
      if (point) {
        onMove(id, { x: point.x, y: point.y + 0.1, z: point.z });
      }
    }
  }, {
    filterTaps: true,
    delay: true,
  });

  return bind;
}
