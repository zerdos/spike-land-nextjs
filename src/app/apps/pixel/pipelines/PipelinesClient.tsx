"use client";

import { PipelineCard, type PipelineData } from "@/components/enhance/PipelineCard";
import { PipelineForm } from "@/components/enhance/PipelineForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AnalysisConfig,
  AutoCropConfig,
  GenerationConfig,
  PromptConfig,
} from "@/lib/ai/pipeline-types";
import type { EnhancementTier, PipelineVisibility } from "@prisma/client";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Pipeline extends PipelineData {
  analysisConfig: AnalysisConfig | null;
  autoCropConfig: AutoCropConfig | null;
  promptConfig: PromptConfig | null;
  generationConfig: GenerationConfig | null;
}

interface PipelinesClientProps {
  initialPipelines: Pipeline[];
}

type FormMode = "create" | "edit" | "fork";

export function PipelinesClient({ initialPipelines }: PipelinesClientProps) {
  const router = useRouter();
  const [pipelines, setPipelines] = useState<Pipeline[]>(initialPipelines);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pipelineToDelete, setPipelineToDelete] = useState<PipelineData | null>(
    null,
  );

  const filteredPipelines = pipelines.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const myPipelines = filteredPipelines.filter((p) => p.isOwner);
  const systemPipelines = filteredPipelines.filter((p) => p.isSystemDefault);
  const publicPipelines = filteredPipelines.filter(
    (p) => !p.isOwner && !p.isSystemDefault,
  );

  const handleCreate = () => {
    setSelectedPipeline(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const handleEdit = (pipeline: PipelineData) => {
    const fullPipeline = pipelines.find((p) => p.id === pipeline.id);
    if (fullPipeline) {
      setSelectedPipeline(fullPipeline);
      setFormMode("edit");
      setFormOpen(true);
    }
  };

  const handleFork = (pipeline: PipelineData) => {
    const fullPipeline = pipelines.find((p) => p.id === pipeline.id);
    if (fullPipeline) {
      setSelectedPipeline(fullPipeline);
      setFormMode("fork");
      setFormOpen(true);
    }
  };

  const handleDeleteClick = (pipeline: PipelineData) => {
    setPipelineToDelete(pipeline);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pipelineToDelete) return;

    try {
      const response = await fetch(`/api/pipelines/${pipelineToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete pipeline");
      }

      setPipelines((prev) => prev.filter((p) => p.id !== pipelineToDelete.id));
      setDeleteDialogOpen(false);
      setPipelineToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete pipeline",
      );
    }
  };

  const handleFormSubmit = async (data: {
    name: string;
    description: string;
    tier: EnhancementTier;
    visibility: PipelineVisibility;
    analysisConfig: AnalysisConfig;
    autoCropConfig: AutoCropConfig;
    promptConfig: PromptConfig;
    generationConfig: GenerationConfig;
  }) => {
    try {
      if (formMode === "edit" && selectedPipeline) {
        const response = await fetch(`/api/pipelines/${selectedPipeline.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update pipeline");
        }

        const { pipeline: updated } = await response.json();
        setPipelines((prev) =>
          prev.map((p) =>
            p.id === selectedPipeline.id
              ? { ...updated, isOwner: true, isSystemDefault: false }
              : p
          )
        );
      } else {
        // Create or Fork
        const endpoint = formMode === "fork" && selectedPipeline
          ? `/api/pipelines/${selectedPipeline.id}/fork`
          : "/api/pipelines";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create pipeline");
        }

        const { pipeline: created } = await response.json();
        setPipelines((prev) => [
          { ...created, isOwner: true, isSystemDefault: false },
          ...prev,
        ]);
      }

      setFormOpen(false);
    } catch (error) {
      console.error("Form submit error:", error);
      alert(error instanceof Error ? error.message : "Operation failed");
    }
  };

  const renderSection = (
    title: string,
    items: Pipeline[],
    showEmpty = true,
  ) => {
    if (items.length === 0 && !showEmpty) return null;

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {items.length === 0
          ? (
            <p className="text-sm text-muted-foreground py-4">
              No pipelines found
            </p>
          )
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((pipeline) => (
                <PipelineCard
                  key={pipeline.id}
                  pipeline={pipeline}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onFork={handleFork}
                />
              ))}
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/apps/pixel")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pixel
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Enhancement Pipelines</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage AI enhancement pipeline configurations
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Pipeline
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search pipelines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Pipeline Sections */}
      <div className="space-y-8">
        {renderSection("My Pipelines", myPipelines)}
        {renderSection("System Defaults", systemPipelines, false)}
        {renderSection("Public Pipelines", publicPipelines, false)}
      </div>

      {/* Form Dialog */}
      <PipelineForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialData={selectedPipeline
          ? {
            id: selectedPipeline.id,
            name: selectedPipeline.name,
            description: selectedPipeline.description || "",
            tier: selectedPipeline.tier,
            visibility: selectedPipeline.visibility,
            analysisConfig: selectedPipeline.analysisConfig || undefined,
            autoCropConfig: selectedPipeline.autoCropConfig || undefined,
            promptConfig: selectedPipeline.promptConfig || undefined,
            generationConfig: selectedPipeline.generationConfig || undefined,
          }
          : undefined}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pipeline</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{pipelineToDelete
                ?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
