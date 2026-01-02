import { EditorMockup } from "../mockups/EditorMockup";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function CTASplitScreen() {
  return (
    <SectionWrapper>
      <div className="bg-[var(--landing-secondary)] rounded-[var(--landing-radius)] overflow-hidden">
        <div className="grid lg:grid-cols-2 lg:h-[500px]">
          <div className="p-12 lg:p-20 flex flex-col justify-center">
            <h2 className="text-3xl md:text-5xl font-[var(--landing-heading-weight)] mb-6">
              Start building for free.
            </h2>
            <p className="text-xl text-[var(--landing-muted-fg)] mb-8">
              Join thousands of developers building the future of the web. No credit card required
              for hobby projects.
            </p>
            <div className="flex gap-4">
              <ThemeButton size="lg">Get Started</ThemeButton>
            </div>
          </div>
          <div className="bg-[var(--landing-muted)]/10 relative">
            <div className="absolute top-12 left-12 right-0 bottom-0 shadow-2xl">
              <EditorMockup />
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
