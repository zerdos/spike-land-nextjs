import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function CTAGradientBanner() {
  return (
    <SectionWrapper>
      <div className="relative rounded-[var(--landing-radius)] overflow-hidden p-12 md:p-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--landing-primary)] to-[var(--landing-accent)] opacity-90" />
        <div className="relative z-10 text-[var(--landing-primary-fg)]">
          <h2 className="text-4xl md:text-6xl font-[var(--landing-heading-weight)] mb-6">
            Ready to start vibe coding?
          </h2>
          <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto opacity-90">
            Join the future of development today. No credit card required.
          </p>
          <div className="flex justify-center gap-4">
            <ThemeButton
              size="xl"
              className="bg-white text-black hover:bg-gray-100 shadow-xl"
            >
              Get Started Free
            </ThemeButton>
            <ThemeButton
              size="xl"
              variant="outline"
              className="border-white text-white hover:bg-white/20 hover:border-white"
            >
              View Documentation
            </ThemeButton>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
