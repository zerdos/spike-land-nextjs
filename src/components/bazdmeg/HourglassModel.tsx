import { ScrollReveal } from "@/components/infographic/shared/ScrollReveal";
import { motion } from "framer-motion";

export function HourglassModel() {
  return (
    <div className="flex flex-col gap-12 items-center">
      <div className="text-center max-w-2xl">
        <h2 className="text-3xl font-bold text-white mb-4">Hourglass Testing Model</h2>
        <p className="text-zinc-400">
          Reverse the traditional pyramid. Focus on what matters: the requirements and the business logic.
        </p>
      </div>

      <div className="relative w-full max-w-xl flex flex-col items-center gap-4">
        {/* E2E Specs */}
        <ScrollReveal variants={{ initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 } }} className="w-full">
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 text-center shadow-[0_0_40px_rgba(99,102,241,0.1)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-indigo-400 px-2 py-1 bg-indigo-500/10 rounded uppercase">20% Share</span>
              <span className="text-xs font-mono text-zinc-500 italic">Humans write these</span>
            </div>
            <h4 className="text-xl font-bold text-white mb-2">E2E Specs (Heavy)</h4>
            <p className="text-sm text-zinc-400">User flows as Given/When/Then. Wiring verification only.</p>
          </div>
        </ScrollReveal>

        {/* The Connector */}
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          whileInView={{ height: 40, opacity: 1 }}
          className="w-px bg-gradient-to-b from-indigo-500/50 to-amber-500/50"
        />

        {/* UI Code (The Narrow Part) */}
        <ScrollReveal delay={0.2} variants={{ initial: { opacity: 0, width: "20%" }, animate: { opacity: 1, width: "60%" } }} className="mx-auto">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <div className="text-[10px] font-bold text-amber-500 px-2 py-0.5 bg-amber-500/10 rounded uppercase inline-block mb-2">Disposable</div>
            <h4 className="text-lg font-bold text-white mb-1">UI Code</h4>
            <p className="text-xs text-zinc-400">AI generates this. Regenerate, don't fix.</p>
          </div>
        </ScrollReveal>

        {/* The Connector */}
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          whileInView={{ height: 40, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-px bg-gradient-to-b from-amber-500/50 to-emerald-500/50"
        />

        {/* Business Logic */}
        <ScrollReveal delay={0.4} variants={{ initial: { opacity: 0, scale: 1.1 }, animate: { opacity: 1, scale: 1 } }} className="w-full">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded uppercase">70% Share</span>
              <span className="text-xs font-mono text-zinc-500 italic">Bulletproof Core</span>
            </div>
            <h4 className="text-2xl font-black text-white mb-3 uppercase tracking-wider">Business Logic Tests (HEAVY)</h4>
            <p className="text-sm text-zinc-400">MCP tools + Unit tests. Validation, contracts, state transitions, edge cases. Never skip.</p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
