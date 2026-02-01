"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { Fragment, useState } from "react";

interface TreeNode {
  id: string;
  label: string;
  question?: string;
  yes?: TreeNode;
  no?: TreeNode;
  result?: string;
  resultType?: "good" | "bad";
}

interface DecisionTreeProps {
  data: TreeNode;
  className?: string;
}

export function DecisionTree({ data, className }: DecisionTreeProps) {
  const [history, setHistory] = useState<TreeNode[]>([data]);
  const currentNode = history[history.length - 1]!;

  const handleChoice = (next: TreeNode | undefined) => {
    if (next) {
      setHistory([...history, next]);
    }
  };

  const reset = () => {
    setHistory([data]);
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="w-full max-w-md space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNode.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full"
          >
            {/* Question Card */}
            {!currentNode.result
              ? (
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center">
                  <h4 className="text-xl font-medium mb-6">
                    {currentNode.question || currentNode.label}
                  </h4>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => handleChoice(currentNode.yes)}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                    >
                      <Check size={18} /> Yes
                    </button>
                    <button
                      onClick={() => handleChoice(currentNode.no)}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                    >
                      <X size={18} /> No
                    </button>
                  </div>
                </div>
              )
              : (
                /* Result Card */
                <div
                  className={cn(
                    "p-8 rounded-2xl text-center border",
                    currentNode.resultType === "good"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-100"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-100",
                  )}
                >
                  <div className="text-3xl mb-4">
                    {currentNode.resultType === "good" ? "🎉" : "💡"}
                  </div>
                  <h4 className="text-xl font-semibold mb-2">{currentNode.label}</h4>
                  <p className="mb-6 opacity-80">{currentNode.result}</p>
                  <button
                    onClick={reset}
                    className="text-sm underline opacity-60 hover:opacity-100"
                  >
                    Start Over
                  </button>
                </div>
              )}
          </motion.div>
        </AnimatePresence>

        {/* History Trail */}
        {history.length > 1 && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-8">
            {history.slice(0, -1).map((node, i) => (
              <Fragment key={i}>
                <span>{node.label}</span>
                <ArrowRight size={12} />
              </Fragment>
            ))}
            <span className="text-white">Current</span>
          </div>
        )}
      </div>
    </div>
  );
}
