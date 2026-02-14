import { GlassCard } from "@/components/infographic/shared/GlassCard";
import { ScrollReveal } from "@/components/infographic/shared/ScrollReveal";
import { InteractiveChecklist } from "@/components/infographic/shared/InteractiveChecklist";

const CHECKPOINTS = [
  {
    title: "1. Pre-Code Checklist",
    description: "Run this BEFORE the AI writes any code.",
    variant: "high" as const,
    items: [
      { id: "pc1", text: "Can I explain the problem in my own words?", completed: false },
      { id: "pc2", text: "Has the AI interviewed me about requirements?", completed: false },
      { id: "pc3", text: "Do I understand why current code exists?", completed: false },
      { id: "pc4", text: "Are my tests green and non-flaky?", completed: false },
    ]
  },
  {
    title: "2. Post-Code Checklist",
    description: "Run this AFTER the AI writes code, BEFORE creating a PR.",
    variant: "highlighted" as const,
    items: [
      { id: "poc1", text: "Can I explain every line to a teammate?", completed: false },
      { id: "poc2", text: "Verified assumptions against architecture?", completed: false },
      { id: "poc3", text: "Agents tested it like a human would?", completed: false },
      { id: "poc4", text: "MCP tool tests cover logic at 100%?", completed: false },
    ]
  },
  {
    title: "3. Pre-PR Checklist",
    description: "Run this BEFORE submitting the pull request.",
    variant: "openClaw" as const,
    items: [
      { id: "pr1", text: "Do unit tests prove the code works?", completed: false },
      { id: "pr2", text: "Does TypeScript pass in strict mode?", completed: false },
      { id: "pr3", text: "Can I answer 'why' for every decision?", completed: false },
      { id: "pr4", text: "Comfortable debugging this at 3am?", completed: false },
    ]
  }
];

export function QualityCheckpoints() {
  return (
    <div className="flex flex-col gap-12">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-4">Quality Gates</h2>
        <p className="text-zinc-400">
          The BAZDMEG method enforces discipline through mandatory checkpoints at every stage of development.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {CHECKPOINTS.map((checkpoint, i) => (
          <ScrollReveal key={checkpoint.title} delay={i * 0.2}>
            <GlassCard variant={checkpoint.variant} className="p-6 h-full flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">{checkpoint.title}</h3>
              <p className="text-xs text-zinc-500 mb-6">{checkpoint.description}</p>
              
              <div className="mt-auto">
                <InteractiveChecklist 
                  items={checkpoint.items} 
                  className="bg-transparent border-none p-0 shadow-none"
                />
              </div>
            </GlassCard>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
