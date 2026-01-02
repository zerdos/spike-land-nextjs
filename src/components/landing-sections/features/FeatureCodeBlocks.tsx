import { EditorMockup } from "../mockups/EditorMockup";
import { SectionWrapper } from "../shared/SectionWrapper";

export function FeatureCodeBlocks() {
  return (
    <SectionWrapper className="bg-[var(--landing-secondary)]/30">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl md:text-5xl font-[var(--landing-heading-weight)] mb-6">
            Code unlike you've ever <br />seen before.
          </h2>
          <div className="space-y-6">
            {[
              { title: "Type Safe", desc: "Full TypeScript support out of the box." },
              { title: "Zero Config", desc: "No webpack. No tsconfig. Just code." },
              { title: "MCP Ready", desc: "Connects to your local AI agents instantly." },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 rounded-[var(--landing-radius)] bg-[var(--landing-primary)]/10 flex items-center justify-center text-[var(--landing-primary)] font-bold text-xl">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                  <p className="text-[var(--landing-muted-fg)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--landing-accent)] to-[var(--landing-primary)] rounded-[var(--landing-radius)] blur-2xl opacity-20" />
          <div className="relative transform rotate-2 hover:rotate-0 transition-transform duration-500">
            <EditorMockup />
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
