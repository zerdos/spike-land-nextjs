"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Requirement,
  RequirementPriority,
  RequirementsManagerProps,
  RequirementStatus,
} from "@/types/app";
import { Check, Edit2, GripVertical, Plus, Trash2, X } from "lucide-react";
import * as React from "react";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const priorityColors: Record<RequirementPriority, BadgeVariant> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

const statusColors: Record<RequirementStatus, BadgeVariant> = {
  pending: "outline",
  "in-progress": "default",
  completed: "secondary",
};

const statusLabels: Record<RequirementStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
};

const generateId = (): string => {
  return "req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
};

export function RequirementsManager({
  requirements,
  onRequirementsChange,
  maxRequirements,
  allowReorder = true,
  readonly = false,
}: RequirementsManagerProps) {
  const [newRequirementText, setNewRequirementText] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");
  const [draggedItem, setDraggedItem] = React.useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = React.useState<string | null>(null);

  const handleAddRequirement = () => {
    if (!newRequirementText.trim()) return;

    if (maxRequirements && requirements.length >= maxRequirements) {
      return;
    }

    const newRequirement: Requirement = {
      id: generateId(),
      text: newRequirementText.trim(),
      priority: "medium",
      status: "pending",
      order: requirements.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onRequirementsChange([...requirements, newRequirement]);
    setNewRequirementText("");
  };

  const handleDeleteRequirement = (id: string) => {
    const filtered = requirements.filter((req) => req.id !== id);
    const reordered = filtered.map((req, index) => ({
      ...req,
      order: index,
    }));
    onRequirementsChange(reordered);
  };

  const handleStartEdit = (requirement: Requirement) => {
    setEditingId(requirement.id);
    setEditingText(requirement.text);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingText.trim()) {
      handleCancelEdit();
      return;
    }

    const updated = requirements.map((req) =>
      req.id === editingId
        ? { ...req, text: editingText.trim(), updatedAt: new Date() }
        : req
    );
    onRequirementsChange(updated);
    setEditingId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleUpdatePriority = (id: string, priority: RequirementPriority) => {
    const updated = requirements.map((req) =>
      req.id === id ? { ...req, priority, updatedAt: new Date() } : req
    );
    onRequirementsChange(updated);
  };

  const handleUpdateStatus = (id: string, status: RequirementStatus) => {
    const updated = requirements.map((req) =>
      req.id === id ? { ...req, status, updatedAt: new Date() } : req
    );
    onRequirementsChange(updated);
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverItem(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const draggedIndex = requirements.findIndex((req) => req.id === draggedItem);
    const targetIndex = requirements.findIndex((req) => req.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const reordered = [...requirements];
    const [removed] = reordered.splice(draggedIndex, 1);
    if (!removed) return;
    reordered.splice(targetIndex, 0, removed);

    const withUpdatedOrder = reordered.map((req, index) => ({
      ...req,
      order: index,
      updatedAt: new Date(),
    }));

    onRequirementsChange(withUpdatedOrder);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: "add" | "edit") => {
    if (e.key === "Enter") {
      if (action === "add") {
        handleAddRequirement();
      } else {
        handleSaveEdit();
      }
    } else if (e.key === "Escape" && action === "edit") {
      handleCancelEdit();
    }
  };

  const sortedRequirements = [...requirements].sort((a, b) => a.order - b.order);

  const canAddMore = !maxRequirements || requirements.length < maxRequirements;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requirements</CardTitle>
        <CardDescription>
          Manage app requirements with priorities and status tracking
          {maxRequirements &&
            " (" + requirements.length + "/" + maxRequirements + ")"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!readonly && (
          <div className="flex gap-2">
            <Input
              placeholder="Add new requirement..."
              value={newRequirementText}
              onChange={(e) => setNewRequirementText(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, "add")}
              disabled={!canAddMore}
              aria-label="New requirement text"
            />
            <Button
              onClick={handleAddRequirement}
              disabled={!newRequirementText.trim() || !canAddMore}
              size="icon"
              aria-label="Add requirement"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {sortedRequirements.length === 0
          ? (
            <div className="text-center py-8 text-muted-foreground">
              No requirements yet. Add your first requirement above.
            </div>
          )
          : (
            <div className="space-y-2">
              {sortedRequirements.map((requirement) => (
                <div
                  key={requirement.id}
                  draggable={allowReorder && !readonly && !editingId}
                  onDragStart={() => handleDragStart(requirement.id)}
                  onDragOver={(e) => handleDragOver(e, requirement.id)}
                  onDrop={(e) => handleDrop(e, requirement.id)}
                  onDragEnd={handleDragEnd}
                  className={"flex items-center gap-2 p-3 rounded-lg border bg-card transition-colors " +
                    (
                      dragOverItem === requirement.id
                        ? "border-primary bg-accent"
                        : "border-border"
                    ) + (draggedItem === requirement.id ? " opacity-50" : "")}
                  data-testid="requirement-item"
                >
                  {allowReorder && !readonly && !editingId && (
                    <GripVertical
                      className="h-4 w-4 text-muted-foreground cursor-grab"
                      aria-label="Drag handle"
                    />
                  )}

                  <div className="flex-1 space-y-2">
                    {editingId === requirement.id
                      ? (
                        <Input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, "edit")}
                          // eslint-disable-next-line jsx-a11y/no-autofocus -- Intentional UX: focus input when editing requirement
                          autoFocus
                          aria-label="Edit requirement text"
                        />
                      )
                      : <p className="text-sm">{requirement.text}</p>}

                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={requirement.priority}
                        onValueChange={(value) =>
                          handleUpdatePriority(
                            requirement.id,
                            value as RequirementPriority,
                          )}
                        disabled={readonly}
                      >
                        <SelectTrigger className="w-[110px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={requirement.status}
                        onValueChange={(value) =>
                          handleUpdateStatus(
                            requirement.id,
                            value as RequirementStatus,
                          )}
                        disabled={readonly}
                      >
                        <SelectTrigger className="w-[130px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Badge
                        variant={priorityColors[requirement.priority]}
                      >
                        {requirement.priority}
                      </Badge>

                      <Badge variant={statusColors[requirement.status]}>
                        {statusLabels[requirement.status]}
                      </Badge>
                    </div>
                  </div>

                  {!readonly && (
                    <div className="flex gap-1">
                      {editingId === requirement.id
                        ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleSaveEdit}
                              aria-label="Save edit"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              aria-label="Cancel edit"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )
                        : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStartEdit(requirement)}
                              aria-label="Edit requirement"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteRequirement(requirement.id)}
                              aria-label="Delete requirement"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
