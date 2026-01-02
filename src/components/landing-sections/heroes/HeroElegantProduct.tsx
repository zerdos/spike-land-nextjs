import { EditorMockup } from "../mockups/EditorMockup";
import { SectionWrapper } from "../shared/SectionWrapper";

export function HeroElegantProduct() {
  return (
    <div className="relative bg-[var(--landing-background)]">
      <SectionWrapper className="pt-32 pb-48 text-center">
        <h1 className="text-5xl md:text-8xl font-[var(--landing-heading-weight)] tracking-tight mb-6">
          Code. <span className="text-[var(--landing-muted)]">Simply.</span>
        </h1>

        <p className="text-2xl md:text-3xl text-[var(--landing-foreground)] max-w-2xl mx-auto font-medium leading-relaxed mb-10">
          The most advanced vibe coding platform is also the easiest to use.
        </p>

        <div className="flex justify-center gap-6 text-xl">
          <a href="#" className="text-[var(--landing-accent)] hover:underline flex items-center">
            Get started <span className="ml-1 text-sm">›</span>
          </a>
          <a href="#" className="text-[var(--landing-accent)] hover:underline flex items-center">
            Watch the film <span className="ml-1 text-sm">›</span>
          </a>
        </div>

        <div className="mt-24 max-w-5xl mx-auto shadow-2xl rounded-xl overflow-hidden">
          <EditorMockup />
        </div>
      </SectionWrapper>
    </div>
  );
}
