import { AgentControlPanel } from "@/components/boxes/agent-control-panel";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BoxDetailPage({ params }: PageProps) {
  const { id } = await params;

  const mockBox = {
    id,
    name: `Agent Box ${id}`,
    description: "Browser Agent Environment",
    status: "RUNNING" as const,
    connectionUrl: "https://example.com/vnc",
    messages: [
      {
        id: "1",
        role: "SYSTEM" as const,
        content: "Agent initialized and ready.",
        createdAt: new Date(),
      },
    ],
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{mockBox.name}</h1>
        {mockBox.description && (
          <p className="text-muted-foreground mt-2">{mockBox.description}</p>
        )}
      </div>
      <AgentControlPanel box={mockBox} />
    </div>
  );
}
