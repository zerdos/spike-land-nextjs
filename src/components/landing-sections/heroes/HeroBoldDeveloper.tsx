import { GradientText } from "../shared/GradientText";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function HeroBoldDeveloper() {
  return (
    <div className="relative bg-[var(--landing-background)]">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <SectionWrapper className="pt-32 pb-32 text-center relative z-10">
        <h1 className="text-6xl md:text-9xl font-[var(--landing-heading-weight)] tracking-tighter leading-none mb-8">
          Develop.<br />
          Preview.<br />
          <GradientText>Ship.</GradientText>
        </h1>

        <div className="max-w-2xl mx-auto space-y-8">
          <p className="text-2xl text-[var(--landing-muted-fg)] font-light">
            spike.land's frontend cloud gives you the developer experience you love, with the
            performance your users need.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <ThemeButton size="xl" className="min-w-[200px]">Start Deploying</ThemeButton>
            <ThemeButton variant="secondary" size="xl" className="min-w-[200px]">
              Get a Demo
            </ThemeButton>
          </div>

          <div className="pt-12 text-sm text-[var(--landing-muted-fg)] uppercase tracking-widest">
            Trusted by the best frontend teams
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
