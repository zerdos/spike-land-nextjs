/**
 * Policy Management Page
 *
 * Main page for policy management including content checking, rule management,
 * and statistics dashboard.
 *
 * Resolves #522 (ORB-065): Build Policy Checker UI
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PolicyCheckPanel } from "@/components/orbit/policy/PolicyCheckPanel";
import { PolicyRuleList } from "@/components/orbit/policy/PolicyRuleList";
import { PolicyStatsDashboard } from "@/components/orbit/policy/PolicyStatsDashboard";

interface PolicyPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { workspaceSlug } = await params;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Policy Management</h1>
        <p className="text-muted-foreground mt-2">
          Check content against policies, manage rules, and view compliance statistics
        </p>
      </div>

      <Tabs defaultValue="check" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="check">Check Content</TabsTrigger>
          <TabsTrigger value="rules">Policy Rules</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="check" className="space-y-6">
          <PolicyCheckPanel workspaceSlug={workspaceSlug} />
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <PolicyRuleList workspaceSlug={workspaceSlug} />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <PolicyStatsDashboard workspaceSlug={workspaceSlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
