/**
 * Crisis Detection Dashboard
 * Resolves #522 (ORB-067): Crisis Detection UI
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrisisEventList } from "@/components/orbit/crisis/CrisisEventList";
import { EmergencyPauseButton } from "@/components/orbit/crisis/EmergencyPauseButton";
import { ResponseTemplateManager } from "@/components/orbit/crisis/ResponseTemplateManager";

interface CrisisPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function CrisisPage({ params }: CrisisPageProps) {
  const { workspaceSlug } = await params;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Crisis Detection</h1>
          <p className="text-muted-foreground mt-2">
            Monitor sentiment spikes and manage crisis response
          </p>
        </div>
        <EmergencyPauseButton
          workspaceSlug={workspaceSlug}
          isPaused={false}
          onToggle={() => {}}
        />
      </div>

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList>
          <TabsTrigger value="events">Crisis Events</TabsTrigger>
          <TabsTrigger value="templates">Response Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <CrisisEventList workspaceSlug={workspaceSlug} />
        </TabsContent>

        <TabsContent value="templates">
          <ResponseTemplateManager workspaceSlug={workspaceSlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
