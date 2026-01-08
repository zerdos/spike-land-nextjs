import { TerminalMockup } from "../mockups/TerminalMockup";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function HeroTechnicalGreen() {
  return (
    <div className="relative bg-[var(--landing-background)] border-b border-[var(--landing-border)]">
      <SectionWrapper className="pt-24 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl md:text-6xl font-[var(--landing-heading-weight)] tracking-tight text-[var(--landing-foreground)]">
              Build in a weekend.<br />
              <span className="text-[var(--landing-primary)]">
                Scale to millions.
              </span>
            </h1>

            <p className="text-xl text-[var(--landing-muted-fg)]">
              spike.land is an open source MCP Server alternative to boring coding. Start your
              project with a Postgres database, Authentication, instant APIs, and Realtime
              subscriptions.
            </p>

            <div className="flex flex-wrap gap-4">
              <ThemeButton
                size="lg"
                className="bg-[var(--landing-primary)] text-black"
              >
                Start your project
              </ThemeButton>
              <ThemeButton variant="secondary" size="lg">
                Documentation
              </ThemeButton>
            </div>

            <div className="pt-4 flex items-center gap-4 text-sm text-[var(--landing-muted-fg)]">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gray-600 border border-black flex items-center justify-center text-xs text-white"
                  >
                    U{i}
                  </div>
                ))}
              </div>
              <span>Join 100,000+ developers building on spike.land</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-[var(--landing-primary)] opacity-10 blur-[80px]" />
            <div className="relative z-10">
              <TerminalMockup command="npx supabase start" />
            </div>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
