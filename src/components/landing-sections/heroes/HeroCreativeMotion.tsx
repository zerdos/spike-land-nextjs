import { BlendrMockup } from "../mockups/BlendrMockup";
import { GradientText } from "../shared/GradientText";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function HeroCreativeMotion() {
  return (
    <div className="relative bg-[var(--landing-background)]">
      <SectionWrapper className="pt-32 pb-48 text-center">
        <h1 className="text-6xl md:text-9xl font-[var(--landing-heading-weight)] tracking-tighter mb-8 leading-none">
          Motion in <br />
          <GradientText className="from-[var(--landing-primary)] via-[var(--landing-accent)] to-[#ff0066]">
            every line.
          </GradientText>
        </h1>

        <p className="text-xl text-[var(--landing-muted-fg)] max-w-xl mx-auto mb-10">
          Design and ship site interactions that feel like magic. No code required (unless you want
          to).
        </p>

        <div className="flex justify-center gap-4">
          <ThemeButton size="lg" className="bg-white text-black hover:bg-white/90 font-bold">
            Start Designing
          </ThemeButton>
          <ThemeButton
            size="lg"
            variant="outline"
            className="border-[var(--landing-muted)] text-[var(--landing-muted-fg)]"
          >
            Watch Tutorial
          </ThemeButton>
        </div>

        <div className="mt-24 relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--landing-primary)] to-[var(--landing-accent)] opacity-20 blur-3xl transform rotate-6" />
          <div className="relative z-10 hover:scale-105 transition-transform duration-700">
            <BlendrMockup />
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
