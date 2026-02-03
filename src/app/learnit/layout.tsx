import { LearnItSearch } from "@/components/learnit/search";
import { BookMarked } from "lucide-react";
import Link from "next/link";

export default function LearnItLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/learnit"
            className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity"
          >
            <BookMarked className="w-6 h-6 text-primary" />
            <span>LearnIt</span>
          </Link>
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            {/* Mini search for header, optional, or reuse main search */}
            <LearnItSearch />
          </div>
          <nav>
            {/* Add nav items if needed */}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
