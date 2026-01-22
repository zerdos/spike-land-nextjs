"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ReminderType } from "@prisma/client";
import { Plus } from "lucide-react";
import { useState } from "react";

interface ReminderCreateData {
  title: string;
  description: string;
  type: ReminderType;
  dueDate: Date;
  connectionId?: string;
}

interface ReminderCreateDialogProps {
  connectionId?: string;
  onCreate: (data: ReminderCreateData) => void;
}

export function ReminderCreateDialog(
  { connectionId, onCreate }: ReminderCreateDialogProps,
) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ReminderType>("FOLLOW_UP");
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleSubmit = () => {
    if (!title || !date) return;

    onCreate({
      title,
      description,
      type,
      dueDate: date,
      connectionId,
    });
    setOpen(false);
    // Reset form
    setTitle("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Reminder</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            placeholder="Reminder title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Select value={type} onValueChange={(v) => setType(v as ReminderType)}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(ReminderType).map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Details (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="border rounded-md p-2 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </div>

          <Button onClick={handleSubmit} disabled={!title || !date}>
            Create Reminder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
