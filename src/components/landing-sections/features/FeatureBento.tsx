import { EditorMockup } from "../mockups/EditorMockup";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeCard } from "../shared/ThemeCard";

export function FeatureBento() {
  return (
    <SectionWrapper>
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-[var(--landing-heading-weight)] mb-4">
          Unfair Advantage
        </h2>
      </div>

      <div className="grid lg:grid-cols-3 lg:grid-rows-2 gap-6 h-auto lg:h-[800px]">
        {/* Large Item */}
        <ThemeCard className="lg:col-span-2 lg:row-span-2 bg-[var(--landing-secondary)] relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4">Monaco-powered Editor</h3>
            <p className="text-[var(--landing-muted-fg)] max-w-md">
              Full IntelliSense, TypeScript support, and Vim mode. It's VS Code in your browser, but
              faster.
            </p>
          </div>
          <div className="absolute top-1/3 left-8 right-0 shadow-2xl transition-transform duration-500 group-hover:-translate-y-4">
            <EditorMockup />
          </div>
        </ThemeCard>

        {/* Medium Item */}
        <ThemeCard className="bg-[var(--landing-secondary)] flex flex-col justify-center">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-xl font-bold mb-2">Instant Scale</h3>
          <p className="text-[var(--landing-muted-fg)]">
            Deploy to edge networks worldwide in milliseconds.
          </p>
        </ThemeCard>

        {/* Medium Item */}
        <ThemeCard className="bg-[var(--landing-secondary)] flex flex-col justify-center">
          <div className="text-4xl mb-4">🛡️</div>
          <h3 className="text-xl font-bold mb-2">Enterprise Security</h3>
          <p className="text-[var(--landing-muted-fg)]">
            SOC2 compliant, SSO, and role-based access control included.
          </p>
        </ThemeCard>
      </div>
    </SectionWrapper>
  );
}
