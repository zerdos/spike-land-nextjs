import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; briefId: string }>;
}) {
  const { workspaceSlug, briefId } = await params;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href={`/orbit/${workspaceSlug}/briefs`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Briefs
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Campaign Brief</h1>
          <p className="text-muted-foreground mt-2">
            Review and generate creative variants
          </p>
        </div>
        <Link href={`/orbit/${workspaceSlug}/briefs/${briefId}/generate`}>
          <Button>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Variants
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <p className="text-muted-foreground">Loading brief details...</p>
      </Card>
    </div>
  );
}
