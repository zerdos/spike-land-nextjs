import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { simulateDiceRoll } from "../lib/physics/dice-simulation";
import { DiceState } from "../types/dice";

export function useDicePhysics(dice: DiceState, onSettle: (id: string, value: number) => void) {
  const rigidBodyRef = useRef<
    {
      wakeUp: () => void;
      applyImpulse: (impulse: { x: number; y: number; z: number; }, wake: boolean) => void;
      applyTorqueImpulse: (torque: { x: number; y: number; z: number; }, wake: boolean) => void;
      linvel: () => { x: number; y: number; z: number; };
      angvel: () => { x: number; y: number; z: number; };
    } | null
  >(null);
  const isRollingRef = useRef(false);

  useEffect(() => {
    if (dice.isRolling && rigidBodyRef.current) {
      isRollingRef.current = true;
      // Reset position slightly up if stuck?
      // Actually, apply impulse is enough usually.
      const { impulse, torque } = simulateDiceRoll(dice.seed, dice.type);

      rigidBodyRef.current.wakeUp();
      rigidBodyRef.current.applyImpulse(impulse, true);
      rigidBodyRef.current.applyTorqueImpulse(torque, true);
    }
  }, [dice.isRolling, dice.seed, dice.type]);

  useFrame(() => {
    if (isRollingRef.current && rigidBodyRef.current) {
      const vel = rigidBodyRef.current.linvel();
      const ang = rigidBodyRef.current.angvel();

      // Check if settled
      if (
        Math.abs(vel.x) < 0.01 && Math.abs(vel.y) < 0.01 && Math.abs(vel.z) < 0.01 &&
        Math.abs(ang.x) < 0.01 && Math.abs(ang.y) < 0.01 && Math.abs(ang.z) < 0.01
      ) {
        isRollingRef.current = false;
        // Determine face up value
        // For MVP just pass 1 or derived result
        onSettle(dice.id, 1);
      }
    }
  });

  return { rigidBodyRef };
}
