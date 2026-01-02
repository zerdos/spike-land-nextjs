import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function CTAFloatingCard() {
  return (
    <div className="border-t border-[var(--landing-border)] bg-[var(--landing-background)]">
      <SectionWrapper>
        <div className="max-w-4xl mx-auto text-center py-12 px-6 rounded-[var(--landing-radius)] border border-[var(--landing-primary)] bg-[var(--landing-primary)]/5 backdrop-blur-sm">
          <h2 className="text-3xl md:text-4xl font-[var(--landing-heading-weight)] mb-6">
            Ready to join the revolution?
          </h2>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <ThemeButton size="lg">Create Account</ThemeButton>
            <ThemeButton size="lg" variant="outline">Read Docs</ThemeButton>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
