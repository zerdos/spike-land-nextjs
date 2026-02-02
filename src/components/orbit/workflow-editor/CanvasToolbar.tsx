import { Button } from "@/components/ui/button";
import { Play, Save } from "lucide-react";

interface CanvasToolbarProps {
  onSave?: () => void;
  onRun?: () => void;
  isSaving?: boolean;
}

export const CanvasToolbar = ({ onSave, onRun, isSaving }: CanvasToolbarProps) => {
  return (
    <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm p-2 rounded-lg border shadow-sm">
      <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
        <Save className="mr-2 h-4 w-4" />
        {isSaving ? "Saving..." : "Save"}
      </Button>
      <Button size="sm" onClick={onRun}>
        <Play className="mr-2 h-4 w-4" />
        Run
      </Button>
    </div>
  );
};
