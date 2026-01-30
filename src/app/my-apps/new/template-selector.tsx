"use client";

/**
 * Template Selector Component
 *
 * Displays all available templates as selectable cards.
 * Includes a "Start from Scratch" option for users who want to build without a template.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllTemplates, type Template } from "../templates";

interface TemplateSelectorProps {
  onSelect: (templateId: string | null) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const templates = getAllTemplates();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose a Template
        </h2>
        <p className="text-gray-600">
          Start with a pre-built template or create from scratch
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Start from Scratch Option */}
        <Card
          className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
          onClick={() => onSelect(null)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Start from Scratch</CardTitle>
                <CardDescription className="mt-2">
                  Build anything you want with AI assistance. No template constraints.
                </CardDescription>
              </div>
              <div className="text-3xl">✨</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Custom</Badge>
              <Badge variant="secondary">Flexible</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Template Cards */}
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => onSelect(template.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  // Map purpose to emoji
  const purposeEmoji: Record<string, string> = {
    "link-in-bio": "🔗",
    "campaign-landing": "🚀",
    "poll": "📊",
    "contest": "🏆",
  };

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-2">
              {template.description}
            </CardDescription>
          </div>
          <div className="text-3xl">
            {purposeEmoji[template.purpose] || "📄"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Template Preview Component (Optional - for future enhancement)
 *
 * Shows a preview of the selected template before proceeding.
 */
interface TemplatePreviewProps {
  templateId: string;
  onBack: () => void;
  onConfirm: () => void;
}

export function TemplatePreview({
  templateId,
  onBack,
  onConfirm,
}: TemplatePreviewProps) {
  const templates = getAllTemplates();
  const template = templates.find((t) => t.id === templateId);

  if (!template) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Template not found</p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {template.name}
        </h2>
        <p className="text-gray-600">{template.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Pre-built React component with modern design</li>
            <li>Responsive layout (mobile & desktop)</li>
            <li>Tailwind CSS styling</li>
            <li>Ready to customize and deploy</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Choose Different Template
        </Button>
        <Button onClick={onConfirm} className="flex-1">
          Continue with This Template
        </Button>
      </div>
    </div>
  );
}
