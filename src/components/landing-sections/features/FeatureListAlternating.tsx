import { BlendrMockup } from "../mockups/BlendrMockup";
import { EditorMockup } from "../mockups/EditorMockup";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function FeatureListAlternating() {
  return (
    <SectionWrapper>
      <div className="space-y-32">
        {/* Feature 1 */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <h3 className="text-3xl md:text-4xl font-[var(--landing-heading-weight)] mb-6">
              Vibe Coding, <br />Defined.
            </h3>
            <p className="text-xl text-[var(--landing-muted-fg)] mb-8">
              Stop fighting your tools. spike.land gets out of your way so you can focus on the
              flow. Write code that feels right, right from the start.
            </p>
            <ThemeButton variant="secondary">Learn more about Vibe</ThemeButton>
          </div>
          <div className="order-1 lg:order-2">
            <EditorMockup />
          </div>
        </div>

        {/* Feature 2 */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-1">
            <BlendrMockup />
          </div>
          <div className="order-2">
            <h3 className="text-3xl md:text-4xl font-[var(--landing-heading-weight)] mb-6">
              Assets in seconds.
            </h3>
            <p className="text-xl text-[var(--landing-muted-fg)] mb-8">
              Need a hero image? A social card? An icon? Just blend it. Our built-in Photo Blendr
              tool lets you create assets without leaving your flow.
            </p>
            <ThemeButton variant="secondary">Try Blendr</ThemeButton>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
