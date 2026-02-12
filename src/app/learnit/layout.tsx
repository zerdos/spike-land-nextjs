import { BookMarked, Search } from "lucide-react";
import Link from "next/link";
import "katex/dist/katex.min.css";

export default function LearnItLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30 selection:text-emerald-100">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05] bg-zinc-950/0 backdrop-blur-xl transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/learnit"
            className="flex items-center gap-2 font-bold text-xl tracking-tight hover:opacity-80 transition-opacity"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
               <BookMarked className="w-5 h-5 text-emerald-400" />
            </div>
            <span>LearnIt</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/learnit"
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Search topics"
            >
              <Search className="w-5 h-5" />
            </Link>
          </nav>
        </div>
      </header>
      <main className="pt-20 min-h-screen">
        {children}
      </main>
    </div>
  );
}
