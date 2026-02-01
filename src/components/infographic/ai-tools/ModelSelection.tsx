"use client";

import { Brain, DollarSign, Trophy, Zap } from "lucide-react";
import { useState } from "react";
import { MODEL_COMPARISON } from "../constants/content";
import { DecisionTree, FlipCard, GlassCard, ScrollReveal } from "../shared";

const DECISION_TREE_DATA = {
  id: "root",
  label: "What is your task?",
  question: "Does the task require complex reasoning or architectural planning?",
  yes: {
    id: "complex",
    label: "Architecture/Design",
    result: "Use Claude 3.5 Opus. It excels at reasoning and big-picture thinking.",
    resultType: "good" as const,
  },
  no: {
    id: "simple",
    label: "Coding/Refactoring",
    question: "Is speed and cost a major factor?",
    yes: {
      id: "fast",
      label: "Speed Critical",
      result: "Use Claude 3.5 Haiku. Blazing fast and very cheap.",
      resultType: "good" as const,
    },
    no: {
      id: "balanced",
      label: "Standard Work",
      result: "Use Claude 3.5 Sonnet. The best balance of capability and speed.",
      resultType: "good" as const,
    },
  },
};

export function ModelSelection() {
  const [activeTab, setActiveTab] = useState<"cards" | "tree">("cards");

  return (
    <div className="min-h-screen flex flex-col justify-center py-24 bg-gradient-to-b from-zinc-950 to-[#0c0c12]">
      <div className="container max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-white">Choose Your Intelligence</h2>
            <div className="inline-flex p-1 rounded-lg bg-white/5 border border-white/10">
              <button
                onClick={() => setActiveTab("cards")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "cards"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Comparison Cards
              </button>
              <button
                onClick={() => setActiveTab("tree")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "tree"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Decision Guide
              </button>
            </div>
          </div>
        </ScrollReveal>

        {activeTab === "cards"
          ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[450px]">
              {MODEL_COMPARISON.map((model, idx) => (
                <ScrollReveal key={idx} delay={idx * 0.1} className="h-full">
                  <FlipCard
                    className="h-full"
                    front={
                      <GlassCard className="h-full p-8 flex flex-col items-center justify-between text-center bg-[#1e1e24] border-white/5">
                        <div>
                          <div
                            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto ${
                              model.recommended
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            <Brain size={32} />
                          </div>
                          <h3 className="text-2xl font-bold mb-2">{model.name}</h3>
                          <p className="text-zinc-500 text-sm mb-6">{model.description}</p>
                        </div>

                        <div className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                          Hover for Specs
                        </div>
                      </GlassCard>
                    }
                    back={
                      <GlassCard
                        variant="highlighted"
                        className="h-full p-8 flex flex-col justify-center bg-zinc-900 border-indigo-500/30"
                      >
                        <h3 className="text-xl font-bold mb-8 text-center text-indigo-300">
                          {model.name} Specs
                        </h3>

                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-sm mb-2 text-zinc-400">
                              <span className="flex items-center gap-2">
                                <Zap size={14} /> Speed
                              </span>
                              <span>{model.speed} tokens/s</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500"
                                style={{ width: `${(model.speed / 100) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-2 text-zinc-400">
                              <span className="flex items-center gap-2">
                                <DollarSign size={14} /> Cost
                              </span>
                              <span>{model.cost}x</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500"
                                style={{ width: `${(model.cost / 5) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-2 text-zinc-400">
                              <span className="flex items-center gap-2">
                                <Trophy size={14} /> SWE-bench
                              </span>
                              <span>{model.score}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500"
                                style={{ width: `${model.score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    }
                  />
                </ScrollReveal>
              ))}
            </div>
          )
          : (
            <div className="min-h-[450px] flex items-center justify-center">
              <DecisionTree data={DECISION_TREE_DATA} />
            </div>
          )}
      </div>
    </div>
  );
}
