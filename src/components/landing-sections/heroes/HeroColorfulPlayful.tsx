import { BlendrMockup } from "../mockups/BlendrMockup";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function HeroColorfulPlayful() {
  return (
    <div className="relative bg-[var(--landing-background)]">
      <SectionWrapper className="pt-32 pb-32 text-center">
        <div className="flex justify-center mb-8">
          <div className="px-4 py-1.5 rounded-full bg-black text-white text-sm font-bold animate-bounce">
            Now with Multiplayer 🚀
          </div>
        </div>

        <h1 className="text-6xl md:text-8xl font-[var(--landing-heading-weight)] tracking-tight mb-8">
          Create together.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--landing-primary)] via-[var(--landing-accent)] to-yellow-400">
            Ship faster.
          </span>
        </h1>

        <p className="text-xl text-[var(--landing-foreground)] max-w-2xl mx-auto mb-10">
          The first vibe coding platform built for teams. Brainstorm, code, and deploy in one shared
          space.
        </p>

        <div className="flex justify-center gap-4">
          <ThemeButton
            size="lg"
            className="bg-black text-white hover:bg-black/80"
          >
            Try for free
          </ThemeButton>
        </div>

        <div className="mt-16 flex justify-center transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
          <BlendrMockup />
        </div>

        {/* Floating cursors decor */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-red-500 transform rotate-[-45deg] pointer-events-none after:content-['Mike'] after:absolute after:top-4 after:left-0 after:bg-red-500 after:text-white after:text-xs after:px-2 after:py-0.5 after:rounded" />
        <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-blue-500 transform rotate-[-45deg] pointer-events-none after:content-['Sarah'] after:absolute after:top-4 after:left-0 after:bg-blue-500 after:text-white after:text-xs after:px-2 after:py-0.5 after:rounded" />
      </SectionWrapper>
    </div>
  );
}
