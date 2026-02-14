import { Briefcase } from "lucide-react";
import Link from "next/link";

export default function CareerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-white/[0.06] sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/career"
            className="flex items-center gap-2 font-bold text-xl text-white hover:opacity-80 transition-opacity"
          >
            <Briefcase className="w-6 h-6 text-blue-400" />
            <span>Career Advisor</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/career"
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/career/assessment"
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
            >
              Assessment
            </Link>
            <Link
              href="/career/explore"
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
            >
              Explore
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
