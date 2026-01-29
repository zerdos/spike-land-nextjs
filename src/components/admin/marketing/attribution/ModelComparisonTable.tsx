"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { useState } from "react";

interface AttributionModelStats {
  model: string;
  value: number;
  conversionCount: number;
}

interface ModelComparisonTableProps {
  models: AttributionModelStats[];
  className?: string;
}

type SortField = "model" | "value" | "conversions" | "avg" | "percent";
type SortDirection = "asc" | "desc";

const MODEL_LABELS: Record<string, string> = {
  FIRST_TOUCH: "First Touch",
  LAST_TOUCH: "Last Touch",
  LINEAR: "Linear",
  TIME_DECAY: "Time Decay",
  POSITION_BASED: "Position-Based",
};

export function ModelComparisonTable({
  models,
  className,
}: ModelComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const totalValue = models.reduce((sum, m) => sum + m.value, 0);

  const sortedModels = [...models].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "model":
        comparison = MODEL_LABELS[a.model]!.localeCompare(
          MODEL_LABELS[b.model]!,
        );
        break;
      case "value":
        comparison = a.value - b.value;
        break;
      case "conversions":
        comparison = a.conversionCount - b.conversionCount;
        break;
      case "avg":
        comparison =
          a.value / (a.conversionCount || 1) -
          b.value / (b.conversionCount || 1);
        break;
      case "percent":
        comparison = a.value / totalValue - b.value / totalValue;
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <MinusIcon className="h-4 w-4" />;
    return sortDirection === "asc"
      ? <ArrowUpIcon className="h-4 w-4" />
      : <ArrowDownIcon className="h-4 w-4" />;
  };

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                onClick={() => handleSort("model")}
                className="flex items-center gap-1 hover:text-foreground"
              >
                Model <SortIcon field="model" />
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => handleSort("value")}
                className="flex items-center justify-end gap-1 hover:text-foreground"
              >
                Total Value <SortIcon field="value" />
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => handleSort("conversions")}
                className="flex items-center justify-end gap-1 hover:text-foreground"
              >
                Conversions <SortIcon field="conversions" />
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => handleSort("avg")}
                className="flex items-center justify-end gap-1 hover:text-foreground"
              >
                Avg Value <SortIcon field="avg" />
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => handleSort("percent")}
                className="flex items-center justify-end gap-1 hover:text-foreground"
              >
                % of Total <SortIcon field="percent" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedModels.map((model) => {
            const avgValue = model.conversionCount
              ? model.value / model.conversionCount
              : 0;
            const percent = totalValue ? (model.value / totalValue) * 100 : 0;

            return (
              <TableRow key={model.model}>
                <TableCell className="font-medium">
                  {MODEL_LABELS[model.model] || model.model}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {model.value.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {model.conversionCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {avgValue.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {percent.toFixed(1)}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
