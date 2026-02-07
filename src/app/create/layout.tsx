import { FeedbackFAB } from "@/components/create/feedback-fab";
import { FeedbackProvider } from "@/components/create/feedback-provider";

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeedbackProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          {children}
        </main>
        <FeedbackFAB />
      </div>
    </FeedbackProvider>
  );
}
