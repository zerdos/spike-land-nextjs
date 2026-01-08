import { EditorMockup } from "../mockups/EditorMockup";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function HeroPrecisionDark() {
  return (
    <div className="relative bg-[var(--landing-background)] overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[var(--landing-primary)] opacity-20 blur-[100px] rounded-full" />

      <SectionWrapper className="pt-32 pb-32 text-center">
        <div className="space-y-6 max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--landing-border)] bg-[var(--landing-secondary)]/50 backdrop-blur-sm text-xs font-medium text-[var(--landing-muted-fg)] mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--landing-primary)] mr-2" />
            Vibe Coding 2.0 is now available
          </div>

          <h1 className="text-5xl md:text-7xl font-[var(--landing-heading-weight)] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
            Built for developers using <br />
            <span className="text-[var(--landing-primary)]">spike.land</span>
          </h1>

          <p className="text-xl md:text-2xl text-[var(--landing-muted-fg)] max-w-2xl mx-auto">
            Meet the new standard for modern software development. Streamline issues, sprints, and
            product roadmaps.
          </p>

          <div className="pt-8 flex justify-center gap-4">
            <ThemeButton size="lg" glow>Get Started</ThemeButton>
            <ThemeButton variant="outline" size="lg">
              Read the Manifesto
            </ThemeButton>
          </div>
        </div>

        <div className="mt-20 relative max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--landing-background)] to-transparent z-10 pointer-events-none h-full bottom-0" />
          <EditorMockup />
        </div>
      </SectionWrapper>
    </div>
  );
}
