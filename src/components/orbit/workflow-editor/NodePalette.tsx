import {
  ACTION_REGISTRY,
  TRIGGER_REGISTRY,
  type ActionMetadata,
} from "@/lib/workflows/actions/metadata";
import * as Icons from "lucide-react";
import type React from "react";

const PaletteItem = ({
  item,
  reactFlowType,
}: {
  item: ActionMetadata;
  reactFlowType: string;
}) => {
  const IconComponent =
    (Icons[item.icon as keyof typeof Icons] as React.ElementType) || Icons.Box;
  const Icon = IconComponent as any;

  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow/type", reactFlowType);
    event.dataTransfer.setData("application/reactflow/actionType", item.type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="flex cursor-grab items-center gap-2 rounded-md border bg-card p-3 text-sm shadow-sm transition-colors hover:border-primary hover:shadow-md active:cursor-grabbing"
      draggable
      onDragStart={onDragStart}
    >
      <div className="rounded-md bg-secondary p-1.5 text-secondary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-medium">{item.label}</div>
        <div className="text-xs text-muted-foreground truncate w-32">
          {item.description}
        </div>
      </div>
    </div>
  );
};

const NodePalette = () => {
  const triggers = TRIGGER_REGISTRY;
  const logic = ACTION_REGISTRY.filter((i) => i.category === "logic");
  const actions = ACTION_REGISTRY.filter((i) => i.category === "action");

  return (
    <aside className="flex h-full w-72 flex-col gap-6 border-r bg-background p-4 overflow-y-auto">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
          Triggers
        </h3>
        <div className="flex flex-col gap-2">
          {triggers.map((item) => (
            <PaletteItem
              key={item.type}
              item={item}
              reactFlowType="trigger"
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
          Logic
        </h3>
        <div className="flex flex-col gap-2">
          {logic.map((item) => (
            <PaletteItem
              key={item.type}
              item={item}
              reactFlowType={
                item.type === "conditional"
                  ? "condition"
                  : item.type === "parallel_execution"
                    ? "group"
                    : "action"
              }
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
          Actions
        </h3>
        <div className="flex flex-col gap-2">
          {actions.map((item) => (
            <PaletteItem key={item.type} item={item} reactFlowType="action" />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default NodePalette;
