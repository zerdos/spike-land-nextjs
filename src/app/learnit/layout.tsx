import { BookMarked, Search } from "lucide-react";
import Link from "next/link";
import "katex/dist/katex.min.css";

export default function LearnItLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-white/[0.06] sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/learnit"
            className="flex items-center gap-2 font-bold text-xl text-white hover:opacity-80 transition-opacity"
          >
            <BookMarked className="w-6 h-6 text-emerald-400" />
            <span>LearnIt</span>
          </Link>
          <nav>
            <Link
              href="/learnit"
              className="p-2 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-white/10 transition-all"
              aria-label="Search topics"
            >
              <Search className="w-5 h-5" />
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
