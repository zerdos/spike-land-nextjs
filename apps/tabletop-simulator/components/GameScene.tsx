"use client";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Suspense } from "react";
import type { GameState } from "../types/game";
import { GameCamera } from "./scene/Camera";
import { TableLighting } from "./scene/Lighting";
import { TableSurface } from "./scene/TableSurface";

interface GameSceneProps {
  gameState?: GameState; // Optional for now
  interactionMode?: "orbit" | "interaction";
}

export default function GameScene({ interactionMode = "orbit" }: GameSceneProps) {
  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 8, 8], fov: 45 }}>
        <color attach="background" args={["#1a1a1a"]} />
        <Suspense fallback={null}>
          <Physics>
            <TableSurface />
            {/* Cards and dice will be rendered here */}
          </Physics>
          <TableLighting />
          <GameCamera mode={interactionMode} />
        </Suspense>
      </Canvas>
    </div>
  );
}
