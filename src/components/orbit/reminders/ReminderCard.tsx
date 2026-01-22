"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { type ConnectionReminder } from "@prisma/client";
import { Calendar } from "lucide-react";
import { SnoozeDropdown } from "./SnoozeDropdown";

interface ReminderCardProps {
  reminder: ConnectionReminder & { connection?: { displayName: string; }; };
  onComplete: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
}

export function ReminderCard({ reminder, onComplete, onSnooze }: ReminderCardProps) {
  const isOverdue = new Date(reminder.dueDate) < new Date() && reminder.status !== "COMPLETED";

  return (
    <Card className={`border-l-4 ${isOverdue ? "border-l-red-500" : "border-l-blue-500"}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <Checkbox
          checked={reminder.status === "COMPLETED"}
          onCheckedChange={() => onComplete(reminder.id)}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4
              className={`font-medium ${
                reminder.status === "COMPLETED" ? "line-through text-muted-foreground" : ""
              }`}
            >
              {reminder.title}
            </h4>
            <Badge variant="outline" className="text-xs">
              {reminder.type.replace("_", " ")}
            </Badge>
          </div>

          {reminder.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {reminder.description}
            </p>
          )}

          {reminder.connection && (
            <p className="text-xs text-muted-foreground mt-2">
              For:{" "}
              <span className="font-medium text-foreground">{reminder.connection.displayName}</span>
            </p>
          )}

          <div className="flex items-center gap-4 mt-3">
            <div
              className={`flex items-center text-xs ${
                isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
              }`}
            >
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(reminder.dueDate).toLocaleDateString()}
            </div>

            <div className="flex-1" />

            {reminder.status !== "COMPLETED" && (
              <SnoozeDropdown onSnooze={(hours) => onSnooze(reminder.id, hours)} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
