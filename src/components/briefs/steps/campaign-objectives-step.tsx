"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useBriefStore } from "@/lib/store/brief";
import { campaignObjectivesSchema } from "@/lib/validation/brief";
import { useEffect, useState } from "react";
import { X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CampaignObjectivesStepProps {
  onValidChange: (isValid: boolean) => void;
}

export function CampaignObjectivesStep({ onValidChange }: CampaignObjectivesStepProps) {
  const { campaignObjectives, setCampaignObjectives } = useBriefStore();

  const [objective, setObjective] = useState(campaignObjectives.objective || "");
  const [kpis, setKpis] = useState<string[]>(campaignObjectives.kpis || []);
  const [successMetrics, setSuccessMetrics] = useState(campaignObjectives.successMetrics || "");
  const [deadline, setDeadline] = useState<Date | undefined>(campaignObjectives.deadline);
  const [kpiInput, setKpiInput] = useState("");

  useEffect(() => {
    const data = {
      objective,
      kpis,
      successMetrics,
      deadline,
    };

    const result = campaignObjectivesSchema.safeParse(data);
    onValidChange(result.success);

    if (result.success) {
      setCampaignObjectives(data);
    }
  }, [objective, kpis, successMetrics, deadline, onValidChange, setCampaignObjectives]);

  const addKpi = () => {
    if (kpiInput.trim() && !kpis.includes(kpiInput.trim())) {
      setKpis([...kpis, kpiInput.trim()]);
      setKpiInput("");
    }
  };

  const removeKpi = (kpi: string) => {
    setKpis(kpis.filter((k) => k !== kpi));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="objective">Campaign Objective</Label>
        <Input
          id="objective"
          placeholder="e.g., Increase brand awareness"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          What is the primary goal of this campaign?
        </p>
      </div>

      <div className="space-y-4">
        <Label>Key Performance Indicators (KPIs)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a KPI (e.g., Click-through rate)"
            value={kpiInput}
            onChange={(e) => setKpiInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKpi();
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {kpis.map((kpi) => (
            <Badge key={kpi} variant="secondary">
              {kpi}
              <button
                onClick={() => removeKpi(kpi)}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="successMetrics">Success Metrics</Label>
        <Textarea
          id="successMetrics"
          placeholder="e.g., Achieve a 20% increase in website traffic within 3 months"
          value={successMetrics}
          onChange={(e) => setSuccessMetrics(e.target.value)}
          rows={4}
        />
        <p className="text-sm text-muted-foreground">
          How will you measure success?
        </p>
      </div>

      <div className="space-y-2">
        <Label>Campaign Deadline (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !deadline && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {deadline ? format(deadline, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={deadline}
              onSelect={setDeadline}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
