import { VibeCodeFAB } from "@/components/create/vibe-code-fab";
import { VibeCodeProvider } from "@/components/create/vibe-code-provider";

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VibeCodeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          {children}
        </main>
        <VibeCodeFAB />
      </div>
    </VibeCodeProvider>
  );
}
