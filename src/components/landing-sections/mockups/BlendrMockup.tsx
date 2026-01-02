import { ThemeCard } from "../shared/ThemeCard";

export function BlendrMockup() {
  return (
    <ThemeCard className="p-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center gap-4 text-white">
      <div className="w-24 h-24 bg-white/20 rounded-lg backdrop-blur flex items-center justify-center text-4xl">
        🍌
      </div>
      <div className="text-2xl font-bold">+</div>
      <div className="w-24 h-24 bg-white/20 rounded-lg backdrop-blur flex items-center justify-center text-4xl">
        🐵
      </div>
      <div className="text-2xl font-bold">=</div>
      <div className="w-32 h-32 bg-white/30 rounded-xl backdrop-blur shadow-2xl flex items-center justify-center text-6xl animate-pulse">
        🐒
      </div>
    </ThemeCard>
  );
}
