import { GlassCard } from "@/components/infographic/shared/GlassCard";
import { ScrollReveal } from "@/components/infographic/shared/ScrollReveal";
import { InteractiveChecklist } from "@/components/infographic/shared/InteractiveChecklist";

const CHECKPOINTS = [
  {
    title: "1. Pre-Code Checklist",
    description: "Run this BEFORE the AI writes any code.",
    variant: "high" as const,
    items: [
      { id: "pc1", label: "Can I explain the problem in my own words?", checked: false },
      { id: "pc2", label: "Has the AI interviewed me about requirements?", checked: false },
      { id: "pc3", label: "Do I understand why current code exists?", checked: false },
      { id: "pc4", label: "Are my tests green and non-flaky?", checked: false },
    ]
  },
  {
    title: "2. Post-Code Checklist",
    description: "Run this AFTER the AI writes code, BEFORE creating a PR.",
    variant: "highlighted" as const,
    items: [
      { id: "poc1", label: "Can I explain every line to a teammate?", checked: false },
      { id: "poc2", label: "Verified assumptions against architecture?", checked: false },
      { id: "poc3", label: "Agents tested it like a human would?", checked: false },
      { id: "poc4", label: "MCP tool tests cover logic at 100%?", checked: false },
    ]
  },
  {
    title: "3. Pre-PR Checklist",
    description: "Run this BEFORE submitting the pull request.",
    variant: "openClaw" as const,
    items: [
      { id: "pr1", label: "Do unit tests prove the code works?", checked: false },
      { id: "pr2", label: "Does TypeScript pass in strict mode?", checked: false },
      { id: "pr3", label: "Can I answer 'why' for every decision?", checked: false },
      { id: "pr4", label: "Comfortable debugging this at 3am?", checked: false },
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
