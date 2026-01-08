import { ThemeCard } from "../shared/ThemeCard";

export function TerminalMockup(
  { command = "npx spike-land@latest create my-app" }: { command?: string; },
) {
  return (
    <ThemeCard className="p-0 overflow-hidden font-mono text-sm border-0 shadow-2xl bg-black text-white">
      {/* Window Chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#333] border-b border-[#444]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="ml-4 text-xs text-gray-400">zsh — 80x24</div>
      </div>

      {/* Terminal Content */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-green-500">➜</span>
          <span className="text-cyan-500">~</span>
          <span>{command}</span>
        </div>
        <div className="mt-2 text-gray-400">
          <div>Downloading spike-land 1.0.0...</div>
          <div>Installing dependencies...</div>
          <div className="text-green-500 mt-2">
            ✓ Project created successfully!
          </div>
          <div className="mt-2 text-white">
            <span className="text-gray-500">$</span> cd my-app && yarn dev
          </div>
        </div>
      </div>
    </ThemeCard>
  );
}
