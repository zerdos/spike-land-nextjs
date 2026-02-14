"use client";

import { Check, Download, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

type InstallState = "idle" | "loading" | "success";

interface InstallButtonProps {
  skillId: string;
  skillSlug: string;
}

export function InstallButton({ skillId, skillSlug }: InstallButtonProps) {
  const [state, setState] = useState<InstallState>("idle");

  const handleInstall = useCallback(async () => {
    if (state !== "idle") return;

    setState("loading");

    try {
      const response = await fetch(`/api/store/skills/${skillId}/install`, {
        method: "POST",
      });

      if (!response.ok) {
        setState("idle");
        return;
      }

      // Copy install command to clipboard
      const command = `claude skill add spike-land/${skillSlug}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(command);
      }

      setState("success");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  }, [skillId, skillSlug, state]);

  return (
    <button
      onClick={handleInstall}
      disabled={state !== "idle"}
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-6 py-2.5 text-sm transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
    >
      {state === "loading" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Installing...
        </>
      )}
      {state === "success" && (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      )}
      {state === "idle" && (
        <>
          <Download className="h-4 w-4" />
          Install Skill
        </>
      )}
    </button>
  );
}
