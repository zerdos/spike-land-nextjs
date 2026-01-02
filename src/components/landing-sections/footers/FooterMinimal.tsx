import { SectionWrapper } from "../shared/SectionWrapper";

export function FooterMinimal() {
  return (
    <footer className="border-t border-[var(--landing-border)] bg-[var(--landing-background)]">
      <SectionWrapper className="py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-3xl">🏜️</span> spike.land
            </div>
            <p className="text-[var(--landing-muted-fg)] max-w-sm">
              The ultimate platform for vibe coding, powered by MCP servers and modern web
              technologies.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-[var(--landing-muted-fg)]">
              <li>
                <a href="#" className="hover:text-[var(--landing-primary)]">Features</a>
              </li>
              <li>
                <a href="#" className="hover:text-[var(--landing-primary)]">Pricing</a>
              </li>
              <li>
                <a href="#" className="hover:text-[var(--landing-primary)]">Documentation</a>
              </li>
              <li>
                <a href="#" className="hover:text-[var(--landing-primary)]">Changelog</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-[var(--landing-muted-fg)]">
              <li>
                <a href="#" className="hover:text-[var(--landing-primary)]">About</a>
              </li>
              <li>
                <a href="#" className="hover:text-[var(--landing-primary)]">Blog</a>
              </li>
              <li>
                <a href="#" className="hover:text-[var(--landing-primary)]">Careers</a>
              </li>
              <li>
                <a href="#" className="hover:text-[var(--landing-primary)]">Contact</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[var(--landing-border)] flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[var(--landing-muted-fg)]">
          <div>&copy; {new Date().getFullYear()} Spike Land Ltd. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[var(--landing-primary)]">Privacy Policy</a>
            <a href="#" className="hover:text-[var(--landing-primary)]">Terms of Service</a>
          </div>
        </div>
      </SectionWrapper>
    </footer>
  );
}
