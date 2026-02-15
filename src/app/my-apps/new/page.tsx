"use client";

import { generateCodespaceId } from "@/lib/apps/codespace-id";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useState } from "react";
import { TemplateSelector } from "./template-selector";

export default function NewAppPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null | undefined>(
    undefined,
  );

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplate(templateId);

    const tempId = generateCodespaceId();

    const url = templateId
      ? `/my-apps/${tempId}?template=${templateId}`
      : `/my-apps/${tempId}`;

    router.push(url);
  };

  if (selectedTemplate === undefined) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <TemplateSelector onSelect={handleTemplateSelect} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground">Initializing workspace...</p>
      </div>
    </div>
  );
}
