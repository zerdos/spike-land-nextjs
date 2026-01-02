import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function CTAMinimalDark() {
  return (
    <SectionWrapper className="border-t border-[var(--landing-border)]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="text-3xl font-[var(--landing-heading-weight)] mb-2">
            Start building today.
          </h2>
          <p className="text-[var(--landing-muted-fg)]">
            Open source, free to use, and ready for production.
          </p>
        </div>
        <div className="flex gap-4">
          <ThemeButton size="lg">Deploy Now</ThemeButton>
          <ThemeButton size="lg" variant="secondary">Contact Us</ThemeButton>
        </div>
      </div>
    </SectionWrapper>
  );
}
