"use client";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TabletopPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  const createRoom = () => {
    const id = nanoid(6);
    router.push(`/apps/tabletop-simulator/room/${id}`);
  };

  const joinRoom = () => {
    if (roomCode) {
      router.push(`/apps/tabletop-simulator/room/${roomCode}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-8 p-4">
      <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
        Tabletop Simulator 3D
      </h1>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={createRoom}
          className="w-full py-4 bg-blue-600 rounded-xl font-bold text-xl shadow-lg hover:bg-blue-500 transition-colors"
        >
          Create New Room
        </button>

        <div className="flex gap-2">
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter Room Code"
            className="flex-1 px-4 py-4 rounded-xl bg-gray-800 text-white border border-gray-700"
          />
          <button
            onClick={joinRoom}
            className="px-6 py-4 bg-gray-700 rounded-xl font-bold hover:bg-gray-600"
          >
            Join
          </button>
        </div>
      </div>

      <div className="text-gray-500 text-sm mt-8">
        Powered by WebRTC & React Three Fiber
      </div>
    </div>
  );
}
