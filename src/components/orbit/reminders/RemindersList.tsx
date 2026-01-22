"use client";

import { type ConnectionReminder } from "@prisma/client";
import { isPast, isToday } from "date-fns";
import { ReminderCard } from "./ReminderCard";

interface RemindersListProps {
  reminders: (ConnectionReminder & { connection?: { displayName: string; }; })[];
  onComplete: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
}

export function RemindersList({ reminders, onComplete, onSnooze }: RemindersListProps) {
  if (!reminders.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No reminders found.
      </div>
    );
  }

  // Groups
  const overdue = reminders.filter(r =>
    isPast(new Date(r.dueDate)) && !isToday(new Date(r.dueDate)) && r.status !== "COMPLETED"
  );
  const today = reminders.filter(r => isToday(new Date(r.dueDate)) && r.status !== "COMPLETED");
  const future = reminders.filter(r =>
    !isPast(new Date(r.dueDate)) && !isToday(new Date(r.dueDate)) && r.status !== "COMPLETED"
  );
  const completed = reminders.filter(r => r.status === "COMPLETED");

  const renderSection = (
    title: string,
    items: typeof reminders,
    color: string = "text-foreground",
  ) => {
    if (!items.length) return null;
    return (
      <div className="mb-6">
        <h3 className={`font-semibold mb-3 ${color}`}>{title} ({items.length})</h3>
        <div className="space-y-3">
          {items.map(r => (
            <ReminderCard
              key={r.id}
              reminder={r}
              onComplete={onComplete}
              onSnooze={onSnooze}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      {renderSection("Overdue", overdue, "text-red-500")}
      {renderSection("Today", today)}
      {renderSection("Upcoming", future)}

      {completed.length > 0 && (
        <div className="mt-8 pt-8 border-t">
          {renderSection("Completed", completed, "text-muted-foreground")}
        </div>
      )}
    </div>
  );
}
