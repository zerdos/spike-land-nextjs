import { TerminalMockup } from "../mockups/TerminalMockup";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function HeroGamingFun() {
  return (
    <div className="relative bg-[var(--landing-background)] overflow-hidden">
      {/* Background Shapes */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--landing-primary)] rounded-full blur-[100px] opacity-20" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--landing-accent)] rounded-full blur-[100px] opacity-20" />
      </div>

      <SectionWrapper className="pt-32 pb-32 text-center relative z-10">
        <h1 className="text-5xl md:text-8xl font-[var(--landing-heading-weight)] uppercase tracking-wide mb-6 font-black">
          IMAGINE A PLACE...
        </h1>

        <p className="text-xl md:text-2xl text-[var(--landing-foreground)] max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          ...where AI agents manage your social media, create content on autopilot, and grow your
          audience while you focus on what matters.
        </p>

        <div className="flex flex-col md:flex-row justify-center gap-6 mb-20">
          <ThemeButton
            size="xl"
            className="rounded-full bg-white text-black hover:text-[var(--landing-primary)] hover:shadow-xl transition-all"
          >
            <span className="mr-2">⬇️</span> Download for Mac
          </ThemeButton>
          <ThemeButton
            size="xl"
            className="rounded-full bg-[var(--landing-secondary)] text-white hover:bg-[var(--landing-secondary)]/80"
          >
            Open in Browser
          </ThemeButton>
        </div>

        <div className="grid md:grid-cols-2 gap-8 text-left max-w-5xl mx-auto">
          <div className="bg-[var(--landing-secondary)] p-8 rounded-[var(--landing-radius)]">
            <h3 className="font-bold text-xl mb-2">
              Create an invite-only place
            </h3>
            <p className="text-[var(--landing-muted)]">
              Where you belong and can code comfortably.
            </p>
          </div>
          <div className="transform md:translate-y-12">
            <TerminalMockup command="npx spike.land invite" />
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
