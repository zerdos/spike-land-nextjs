import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeButton } from "../shared/ThemeButton";

export function HeroWarmFriendly() {
  return (
    <div className="relative bg-[var(--landing-background)]">
      <SectionWrapper className="pt-32 pb-32">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-4xl">🏝️</span>
            <h1 className="text-5xl md:text-7xl font-[var(--landing-heading-weight)] tracking-tight">
              Your code, organized.
            </h1>
          </div>

          <p className="text-2xl text-[var(--landing-foreground)] leading-relaxed mb-8 font-serif">
            Finally, a coding environment that feels like a home. write docs, plan sprints, and ship
            code all in one beautiful workspace.
          </p>

          <div className="flex gap-4 mb-16">
            <ThemeButton
              size="lg"
              className="bg-[var(--landing-accent)] text-white hover:bg-[var(--landing-accent)]/90"
            >
              Get spike.land free
            </ThemeButton>
            <ThemeButton
              size="lg"
              variant="ghost"
              className="text-[var(--landing-accent)] hover:bg-[var(--landing-accent)]/10"
            >
              Request a demo
            </ThemeButton>
          </div>

          <div className="border border-[var(--landing-border)] rounded-sm p-8 bg-white shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">📝</span> README.md
            </h3>
            <div className="space-y-4 text-[var(--landing-foreground)] font-serif">
              <p>Welcome to your new workspace. Here's a quick checklist:</p>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  className="accent-[var(--landing-foreground)]"
                />
                <span>Install the MCP server</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  className="accent-[var(--landing-foreground)]"
                />
                <span>Create your first component</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="accent-[var(--landing-foreground)]" />
                <span>Deploy to production</span>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}
