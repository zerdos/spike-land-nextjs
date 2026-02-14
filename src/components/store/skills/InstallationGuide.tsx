"use client";

import { Check, Copy, Terminal } from "lucide-react";
import { useCallback, useState } from "react";

interface InstallationGuideProps {
  skillSlug: string;
}

export function InstallationGuide({ skillSlug }: InstallationGuideProps) {
  const [copied, setCopied] = useState(false);
  const command = `claude skill add spike-land/${skillSlug}`;

  const handleCopy = useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        return;
      }
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail if clipboard is not available
    }
  }, [command]);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Installation</h2>

      {/* Terminal mockup */}
      <div className="rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-muted-foreground/50 font-mono">
              Terminal
            </span>
          </div>
        </div>

        {/* Command area */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Terminal className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <code className="text-sm font-mono text-green-400 truncate">
              {command}
            </code>
          </div>

          <button
            onClick={handleCopy}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all duration-200"
            type="button"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Additional instructions */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          Run the command above in your terminal to install this skill. Make sure you have
          the Claude CLI installed and authenticated.
        </p>
      </div>
    </section>
  );
}
