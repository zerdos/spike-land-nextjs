import Link from "next/link";
import { FooterWrapper } from "./FooterWrapper";
import { NewsletterForm } from "./NewsletterForm";

export function Footer() {
  return (
    <FooterWrapper>
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <h3 className="text-xl font-bold tracking-tight text-white font-heading">
                Spike Land
              </h3>
              <p className="text-sm text-muted-foreground">
                AI-Powered Software & Social Media Solutions.
              </p>
              <p className="text-xs text-muted-foreground/70">
                📍 Based in Brighton, working with businesses across the UK
              </p>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <h4 className="text-sm font-semibold text-white font-heading">
                Subscribe to our newsletter
              </h4>
              <p className="text-sm text-muted-foreground">
                Get the latest updates on new features and AI advancements.
              </p>
              <NewsletterForm />
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white font-heading">Explore</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-primary transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/portfolio" className="hover:text-primary transition-colors">
                    Portfolio
                  </Link>
                </li>
                <li>
                  <Link href="/press" className="hover:text-primary transition-colors">
                    Press
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-primary transition-colors">
                    Blog
                  </Link>
                </li>
              </ul>

              <h4 className="text-sm font-semibold text-white font-heading pt-2">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Spike Land. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </FooterWrapper>
  );
}
