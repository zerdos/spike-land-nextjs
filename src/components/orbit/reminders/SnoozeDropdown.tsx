"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock } from "lucide-react";

interface SnoozeDropdownProps {
  onSnooze: (hours: number) => void;
  disabled?: boolean;
}

const SNOOZE_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "4 hours", hours: 4 },
  { label: "Tomorrow", hours: 24 },
  { label: "Next Week", hours: 24 * 7 },
];

export function SnoozeDropdown({ onSnooze, disabled }: SnoozeDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Clock className="mr-2 h-4 w-4" />
          Snooze
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SNOOZE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.hours}
            onClick={() => onSnooze(option.hours)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
