import { CreateSearch } from "@/components/create/create-search";
import { FeedbackFAB } from "@/components/create/feedback-fab";
import { FeedbackProvider } from "@/components/create/feedback-provider";
import { Code2 } from "lucide-react";
import Link from "next/link";

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeedbackProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              href="/create"
              className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity"
            >
              <Code2 className="w-6 h-6 text-primary" />
              <span>Create</span>
            </Link>
            <div className="flex-1 max-w-md mx-4 hidden md:block">
              <CreateSearch />
            </div>
            <nav>
              {/* Add nav items if needed */}
            </nav>
          </div>
        </header>
        <main>
          {children}
        </main>
        <FeedbackFAB />
      </div>
    </FeedbackProvider>
  );
}
