import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ACTION_REGISTRY } from "@/lib/workflows/actions/metadata";
import { useReactFlow } from "reactflow";
import type { WorkflowNode } from "../types";

export const ActionConfigForm = ({ node }: { node: WorkflowNode }) => {
  const { setNodes } = useReactFlow();
  const actionType =
    (node.data.config["actionType"] as string) || node.data.type.toLowerCase();

  const metadata = ACTION_REGISTRY.find((m) => m.type === actionType);

  const handleChange = (field: string, value: any) => {
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

  if (!metadata) {
    return (
      <div className="text-sm text-muted-foreground">
        No configuration available for {actionType}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium">{metadata.label}</h3>
        <p className="text-xs text-muted-foreground">{metadata.description}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={node.data.label}
            onChange={(e) => {
              setNodes((nds) =>
                nds.map((n) => {
                  if (n.id === node.id) {
                    return {
                      ...n,
                      data: { ...n.data, label: e.target.value },
                    };
                  }
                  return n;
                }),
              );
            }}
          />
        </div>

        {metadata.fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label className="flex items-center justify-between">
              {field.label}
              {field.required && <span className="text-destructive">*</span>}
            </Label>

            {field.type === "string" && (
              <Input
                value={(node.data.config[field.name] as string) || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
              />
            )}

            {field.type === "number" && (
              <Input
                type="number"
                value={(node.data.config[field.name] as number) || ""}
                onChange={(e) => handleChange(field.name, Number(e.target.value))}
                placeholder={field.placeholder}
              />
            )}

            {field.type === "boolean" && (
              <Switch
                checked={(node.data.config[field.name] as boolean) || false}
                onCheckedChange={(checked) => handleChange(field.name, checked)}
              />
            )}

            {field.type === "select" && field.options && (
              <Select
                value={(node.data.config[field.name] as string) || ""}
                onValueChange={(value) => handleChange(field.name, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(field.type === "json" || field.type === "code") && (
              <Textarea
                className="font-mono text-xs min-h-[100px]"
                value={
                  typeof node.data.config[field.name] === "object"
                    ? JSON.stringify(node.data.config[field.name], null, 2)
                    : (node.data.config[field.name] as string) || ""
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

            {field.description && (
              <p className="text-[10px] text-muted-foreground">
                {field.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
