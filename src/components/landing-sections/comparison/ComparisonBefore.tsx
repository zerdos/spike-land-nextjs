import { SectionWrapper } from "../shared/SectionWrapper";

export function ComparisonBefore() {
  return (
    <SectionWrapper className="bg-[var(--landing-secondary)]/30">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-[var(--landing-heading-weight)] mb-4">
          Stop configuration hell.
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Before */}
        <div className="p-8 rounded-[var(--landing-radius)] bg-red-500/10 border border-red-500/20">
          <h3 className="text-red-500 font-bold mb-6 text-xl">The Old Way</h3>
          <ul className="space-y-4 text-[var(--landing-muted-fg)]">
            <li className="flex gap-3">
              <span className="text-red-500">×</span> Wrestling with webpack config
            </li>
            <li className="flex gap-3">
              <span className="text-red-500">×</span> "It works on my machine"
            </li>
            <li className="flex gap-3">
              <span className="text-red-500">×</span> Waiting 10m for CI/CD builds
            </li>
            <li className="flex gap-3">
              <span className="text-red-500">×</span> Managing local .env secrets
            </li>
          </ul>
        </div>

        {/* After */}
        <div className="p-8 rounded-[var(--landing-radius)] bg-[var(--landing-primary)]/10 border border-[var(--landing-primary)]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 bg-[var(--landing-primary)] text-[var(--landing-primary-fg)] text-xs font-bold rounded-bl-[var(--landing-radius)]">
            SPIKE.LAND
          </div>
          <h3 className="text-[var(--landing-primary)] font-bold mb-6 text-xl">The Vibe Way</h3>
          <ul className="space-y-4 text-[var(--landing-foreground)]">
            <li className="flex gap-3">
              <span className="text-[var(--landing-primary)]">✓</span> Zero configuration
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--landing-primary)]">✓</span> Works everywhere, instantly
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--landing-primary)]">✓</span> Instant previews & deploys
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--landing-primary)]">✓</span> Built-in secret management
            </li>
          </ul>
        </div>
      </div>
    </SectionWrapper>
  );
}
