import { TerminalMockup } from "../mockups/TerminalMockup";
import { GradientText } from "../shared/GradientText";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function HeroGradientWave() {
  return (
    <div className="relative overflow-hidden bg-[var(--landing-background)]">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--landing-background)] to-[var(--landing-secondary)] opacity-50 skew-y-[-5deg] origin-top-left scale-150 transform translate-y-[-20%]" />

      <SectionWrapper className="pt-32 pb-48">
        <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-8">
            <h1 className="text-5xl md:text-7xl font-[var(--landing-heading-weight)] tracking-tight leading-[1.1]">
              The infrastructure for <GradientText>vibe coding</GradientText>
            </h1>
            <p className="text-xl text-[var(--landing-muted-fg)] leading-relaxed max-w-xl">
              Millions of developers use spike.land to build, run, and scale their vibe coding
              experiments without touching a single config file.
            </p>
            <div className="flex flex-wrap gap-4">
              <ThemeButton size="lg" glow>Start now</ThemeButton>
              <ThemeButton variant="ghost" size="lg">
                Contact sales &rarr;
              </ThemeButton>
            </div>
          </div>

          <div className="relative">
            {/* Floating Elements Animation would go here */}
            <div className="relative z-10 transform md:rotate-3 transition-transform hover:rotate-0 duration-500">
              <TerminalMockup command="npx spike-land@latest init" />
            </div>
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-[var(--landing-accent)] opacity-20 blur-3xl rounded-full" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[var(--landing-primary)] opacity-20 blur-3xl rounded-full" />
          </div>
        </div>
      </SectionWrapper>

      {/* Angled Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-[var(--landing-background)] transform skew-y-[-3deg] origin-bottom-right translate-y-12" />
    </div>
  );
}
