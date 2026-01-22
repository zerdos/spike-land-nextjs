"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export interface ConnectionFilterValues {
  search: string;
  warmth: string;
  status: string;
}

interface ConnectionFiltersProps {
  filters: ConnectionFilterValues;
  onFilterChange: (newFilters: ConnectionFilterValues) => void;
}

export function ConnectionFilters({ filters, onFilterChange }: ConnectionFiltersProps) {
  const handleChange = (key: keyof ConnectionFilterValues, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex gap-3 mb-6 items-center flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search connections..."
          className="pl-9"
          value={filters.search}
          onChange={(e) => handleChange("search", e.target.value)}
        />
      </div>

      <Select
        value={filters.warmth}
        onValueChange={(val) => handleChange("warmth", val)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Warmth" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Warmth</SelectItem>
          <SelectItem value="hot">Hot 🔥</SelectItem>
          <SelectItem value="warm">Warm 🌡️</SelectItem>
          <SelectItem value="cold">Cold ❄️</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(val) => handleChange("status", val)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Pipeline" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stages</SelectItem>
          <SelectItem value="NONE">None</SelectItem>
          <SelectItem value="INTERESTED">Interested</SelectItem>
          <SelectItem value="CHATTING">Chatting</SelectItem>
          <SelectItem value="SUGGESTED">Suggested</SelectItem>
          <SelectItem value="SCHEDULED">Scheduled</SelectItem>
          <SelectItem value="MET">Met</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
