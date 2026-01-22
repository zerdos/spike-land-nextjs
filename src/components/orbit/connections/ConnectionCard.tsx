import { UserAvatar } from "@/components/auth/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { type Connection, type ConnectionPlatformPresence } from "@prisma/client";
import { Calendar, MessageSquare } from "lucide-react";
import Link from "next/link";
import { ConnectionPlatformIcons } from "./ConnectionPlatformIcons";
import { ConnectionWarmthBadge } from "./ConnectionWarmthBadge";

// Extended type to include relations
export type ConnectionWithRelations = Connection & {
  platformPresence: ConnectionPlatformPresence[];
};

interface ConnectionCardProps {
  connection: ConnectionWithRelations;
  workspaceSlug: string;
}

export function ConnectionCard({ connection, workspaceSlug }: ConnectionCardProps) {
  return (
    <Link href={`/orbit/${workspaceSlug}/connections/${connection.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={{
                name: connection.displayName,
                image: connection.avatarUrl,
              }}
              className="h-10 w-10 border"
            />
            <div>
              <h3 className="font-semibold leading-none truncate max-w-[150px]">
                {connection.displayName}
              </h3>
              <div className="mt-1">
                <ConnectionPlatformIcons platforms={connection.platformPresence} />
              </div>
            </div>
          </div>
          <ConnectionWarmthBadge score={connection.warmthScore} showScore={false} />
        </CardHeader>

        <CardContent className="p-4 pt-2">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {connection.notes || "No notes"}
          </p>

          <div className="flex gap-2 mt-3 flex-wrap">
            {connection.meetupStatus !== "NONE" && (
              <Badge variant="secondary" className="text-xs font-normal">
                {connection.meetupStatus.replace("_", " ")}
              </Badge>
            )}
            {connection.nextStep !== "NONE" && connection.nextStep && (
              <Badge
                variant="outline"
                className="text-xs font-normal border-blue-200 bg-blue-50 text-blue-700"
              >
                Next: {connection.nextStep.replace("_", " ")}
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 text-xs text-muted-foreground flex justify-between">
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span>{connection.interactionCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {connection.lastInteraction
                ? new Date(connection.lastInteraction).toLocaleDateString()
                : "Never"}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
