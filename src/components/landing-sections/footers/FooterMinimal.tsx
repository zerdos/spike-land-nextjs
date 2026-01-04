import Link from "next/link";
import { SectionWrapper } from "../shared/SectionWrapper";

const socialLinks = [
  { name: "X", url: "https://x.com/ai_spike_land", icon: "𝕏" },
  { name: "LinkedIn", url: "https://linkedin.com/company/spike-land", icon: "in" },
  { name: "GitHub", url: "https://github.com/zerdos", icon: "GH" },
  { name: "Discord", url: "https://discord.gg/5bnH9stj", icon: "💬" },
  { name: "YouTube", url: "https://youtube.com/@spike_land", icon: "▶" },
];

export function FooterMinimal() {
  return (
    <footer className="border-t border-[var(--landing-border)] bg-[var(--landing-background)]">
      <SectionWrapper className="py-12">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-3xl">🏜️</span> spike.land
            </div>
            <p className="text-[var(--landing-muted-fg)] max-w-sm mb-4">
              AI-powered creative platform for image enhancement and vibe coding.
            </p>
            {/* Social Icons */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-[var(--landing-muted)] flex items-center justify-center text-sm font-bold hover:bg-[var(--landing-primary)] hover:text-white transition-colors"
                  title={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-[var(--landing-muted-fg)]">
              <li>
                <Link href="/pixel" className="hover:text-[var(--landing-primary)]">
                  Pixel
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[var(--landing-primary)]">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-[var(--landing-primary)]">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/social" className="hover:text-[var(--landing-primary)]">
                  Social
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-[var(--landing-muted-fg)]">
              <li>
                <Link href="/press" className="hover:text-[var(--landing-primary)]">
                  Press Kit
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-[var(--landing-primary)]">
                  Community
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/zerdos/spike-land-nextjs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--landing-primary)]"
                >
                  Open Source
                </a>
              </li>
              <li>
                <a href="mailto:hello@spike.land" className="hover:text-[var(--landing-primary)]">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-[var(--landing-muted-fg)]">
              <li>
                <Link href="/privacy" className="hover:text-[var(--landing-primary)]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[var(--landing-primary)]">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[var(--landing-border)] flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[var(--landing-muted-fg)]">
          <div>
            &copy; {new Date().getFullYear()}{" "}
            SPIKE LAND LTD (UK Company #16906682). All rights reserved.
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[var(--landing-primary)]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--landing-primary)]">
              Terms
            </Link>
            <Link href="/press" className="hover:text-[var(--landing-primary)]">
              Press
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </footer>
  );
}
