/**
 * Audit Log Filters - Search and filter controls
 * Resolves #522 (ORB-068): Audit Log UI
 */

"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface AuditLogFiltersProps {
  filters: {
    search: string;
    action: string;
    targetType: string;
    dateRange: string;
  };
  onFilterChange: (filters: AuditLogFiltersProps["filters"]) => void;
  onSearch: () => void;
}

export function AuditLogFilters({ filters, onFilterChange, onSearch }: AuditLogFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="md:col-span-2 space-y-2">
        <Label>Search</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search by user, target, or ID..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
          <Button onClick={onSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Action</Label>
        <Select
          value={filters.action}
          onValueChange={(value) => onFilterChange({ ...filters, action: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="CREATE">Create</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Target Type</Label>
        <Select
          value={filters.targetType}
          onValueChange={(value) => onFilterChange({ ...filters, targetType: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="POST">Post</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="WORKSPACE">Workspace</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Date Range</Label>
        <Select
          value={filters.dateRange}
          onValueChange={(value) => onFilterChange({ ...filters, dateRange: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
