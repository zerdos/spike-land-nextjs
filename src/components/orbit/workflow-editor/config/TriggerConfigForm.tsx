import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TRIGGER_REGISTRY } from "@/lib/workflows/actions/metadata";
import { useReactFlow } from "reactflow";
import type { WorkflowNode } from "../types";

export const TriggerConfigForm = ({ node }: { node: WorkflowNode }) => {
  const { setNodes } = useReactFlow();
  const config = node.data.config as Record<string, unknown>;
  const triggerType = (config["triggerType"] as string) || "schedule";
  const metadata =
    TRIGGER_REGISTRY.find((m) => m.type === triggerType) || TRIGGER_REGISTRY[0];

  const handleChange = (field: string, value: unknown) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            data: {
              ...n.data,
              config: {
                ...n.data.config,
                [field]: value,
              },
            },
          };
        }
        return n;
      }),
    );
  };

  const handleTypeChange = (value: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            data: {
              ...n.data,
              config: {
                ...n.data.config,
                triggerType: value,
              },
            },
          };
        }
        return n;
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium">Trigger Configuration</h3>
        <p className="text-xs text-muted-foreground">
          {metadata?.description}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Trigger Type</Label>
        <Select value={triggerType} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_REGISTRY.map((t) => (
              <SelectItem key={t.type} value={t.type}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {metadata?.fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label className="flex items-center justify-between">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          {field.type === "string" && (
            <Input
              value={(config[field.name] as string) || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
            />
          )}
          {field.type === "json" && (
            <Textarea
              className="font-mono text-xs min-h-[100px]"
              value={
                typeof config[field.name] === "object"
                  ? JSON.stringify(config[field.name], null, 2)
                  : (config[field.name] as string) || ""
              }
              onChange={(e) => {
                const val = e.target.value;
                try {
                  const parsed = JSON.parse(val);
                  handleChange(field.name, parsed);
                } catch {
                  handleChange(field.name, val);
                }
              }}
              placeholder="{}"
            />
          )}
        </div>
      ))}
    </div>
  );
};
