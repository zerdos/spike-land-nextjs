"use client";

import { UserAvatar } from "@/components/auth/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  type Connection,
  type ConnectionPlatformPresence,
  MeetupPipelineStatus,
} from "@prisma/client";
import { ArrowLeft, Clock, MessageSquare, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConnectionPlatformIcons } from "./ConnectionPlatformIcons";
import { ConnectionWarmthBadge } from "./ConnectionWarmthBadge";
import { MeetupPipelineSelect } from "./MeetupPipelineSelect";

type ConnectionDetailProps = {
  connection: Connection & {
    platformPresence: ConnectionPlatformPresence[];
  };
  workspaceSlug: string;
};

export function ConnectionDetail({ connection, workspaceSlug }: ConnectionDetailProps) {
  const [pipelineStatus, setPipelineStatus] = useState<MeetupPipelineStatus>(
    connection.meetupStatus,
  );
  const [notes, setNotes] = useState(connection.notes || "");

  const handleStatusChange = (newStatus: MeetupPipelineStatus) => {
    setPipelineStatus(newStatus);
    // TODO: Call API to update status
  };

  const handleSaveNotes = () => {
    // TODO: Call API to save notes
    console.log("Saving notes:", notes);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href={`/orbit/${workspaceSlug}/connections`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Connection Details</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <UserAvatar
                user={{ name: connection.displayName, image: connection.avatarUrl }}
                className="h-20 w-20 border-2"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">{connection.displayName}</h2>
                    <div className="mt-2">
                      <ConnectionPlatformIcons platforms={connection.platformPresence} />
                    </div>
                  </div>
                  <ConnectionWarmthBadge
                    score={connection.warmthScore}
                    className="text-sm px-3 py-1"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {connection.interactionCount} interactions
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Last seen {connection.lastInteraction
                    ? new Date(connection.lastInteraction).toLocaleDateString()
                    : "Never"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add notes about this connection..."
                className="min-h-[150px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button onClick={handleSaveNotes} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
                Meetup Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MeetupPipelineSelect status={pipelineStatus} onChange={handleStatusChange} />
              <p className="text-xs text-muted-foreground mt-2">
                Current status in the relationship pipeline.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
                Next Step
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connection.nextStep
                ? (
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className="w-fit">
                      {connection.nextStep.replace("_", " ")}
                    </Badge>
                    {connection.nextStepDueDate && (
                      <span className="text-xs text-red-500">
                        Due: {new Date(connection.nextStepDueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )
                : <p className="text-sm text-muted-foreground">No next step planned</p>}
            </CardContent>
          </Card>

          {/* Placeholder for Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
                Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">
                Coming soon...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
