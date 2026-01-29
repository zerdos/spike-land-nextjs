import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function BriefsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Campaign Briefs</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage campaign briefs for your creative factory
          </p>
        </div>
        <Link href={`/orbit/${workspaceSlug}/briefs/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Brief
          </Button>
        </Link>
      </div>

      <div className="text-center py-12 text-muted-foreground">
        <p>No briefs yet. Create your first brief to get started.</p>
      </div>
    </div>
  );
}
