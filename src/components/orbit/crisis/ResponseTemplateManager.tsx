/**
 * Response Template Manager - Manage crisis response templates
 * Resolves #522 (ORB-067): Crisis Detection UI
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
}

interface ResponseTemplateManagerProps {
  workspaceSlug: string;
}

export function ResponseTemplateManager({ workspaceSlug }: ResponseTemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/orbit/${workspaceSlug}/crisis/templates`
      );
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (_error) {
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceSlug]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Response Templates</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground col-span-2">Loading templates...</p>
        ) : templates.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="pt-6 text-center text-muted-foreground">
              No templates found. Create your first response template.
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{template.category}</p>
                <p className="text-sm line-clamp-3">{template.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
