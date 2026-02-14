"use client";

import { Check, Copy, Download } from "lucide-react";
import { useCallback, useState } from "react";

interface InstallButtonProps {
  skillId: string;
  skillSlug: string;
}

export function InstallButton({ skillId, skillSlug }: InstallButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const installCommand = `claude skill add spike-land/${skillSlug}`;

  const handleInstall = useCallback(async () => {
    if (state === "loading") return;
    setState("loading");

    try {
      await fetch(`/api/store/skills/${skillId}/install`, {
        method: "POST",
      });
    } catch {
      // Install tracking is best-effort
    }

    try {
      await navigator.clipboard.writeText(installCommand);
    } catch {
      // Clipboard may not be available
    }

    setState("success");
    setTimeout(() => setState("idle"), 2000);
  }, [skillId, installCommand, state]);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
      <button
        onClick={handleInstall}
        disabled={state === "loading"}
        className="px-8 py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-zinc-950 font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
      >
        {state === "success"
          ? (
            <>
              <Check className="w-5 h-5" />
              Copied to clipboard!
            </>
          )
          : state === "loading"
            ? (
              <>
                <Download className="w-5 h-5 animate-bounce" />
                Installing...
              </>
            )
            : (
              <>
                <Copy className="w-5 h-5" />
                Copy Install Command
              </>
            )}
      </button>
    </div>
  );
}
