"use client";

import { ConnectionCard, type ConnectionWithRelations } from "./ConnectionCard";

interface ConnectionsListProps {
  connections: ConnectionWithRelations[];
  workspaceSlug: string;
}

export function ConnectionsList({ connections, workspaceSlug }: ConnectionsListProps) {
  if (connections.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10 border-dashed">
        <h3 className="text-lg font-medium">No connections found</h3>
        <p className="text-muted-foreground mt-2">
          Start by syncing from your inbox or adding a connection manually.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {connections.map((connection) => (
        <ConnectionCard
          key={connection.id}
          connection={connection}
          workspaceSlug={workspaceSlug}
        />
      ))}
    </div>
  );
}
