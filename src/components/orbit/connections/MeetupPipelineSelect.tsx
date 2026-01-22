"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeetupPipelineStatus } from "@prisma/client";

interface MeetupPipelineSelectProps {
  status: MeetupPipelineStatus;
  onChange: (status: MeetupPipelineStatus) => void;
  isLoading?: boolean;
}

const STATUS_LABELS: Record<MeetupPipelineStatus, string> = {
  NONE: "None",
  INTERESTED: "Interested",
  CHATTING: "Chatting",
  SUGGESTED: "Suggested",
  SCHEDULED: "Scheduled",
  MET: "Met",
  FOLLOW_UP: "Follow Up",
};

const STATUS_ICONS: Record<MeetupPipelineStatus, string> = {
  NONE: "⚪️",
  INTERESTED: "👀",
  CHATTING: "💬",
  SUGGESTED: "📅",
  SCHEDULED: "🗓️",
  MET: "🤝",
  FOLLOW_UP: "🔄",
};

export function MeetupPipelineSelect({
  status,
  onChange,
  isLoading,
}: MeetupPipelineSelectProps) {
  return (
    <Select
      value={status}
      onValueChange={(value) => onChange(value as MeetupPipelineStatus)}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(MeetupPipelineStatus).map(([key, value]) => (
          <SelectItem key={key} value={value}>
            <span className="mr-2">{STATUS_ICONS[value]}</span>
            {STATUS_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
