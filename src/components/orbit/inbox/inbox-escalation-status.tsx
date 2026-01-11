import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EscalationStatus } from "@prisma/client";
import { CheckCircle, Clock, ShieldAlert } from "lucide-react";

interface InboxEscalationStatusProps {
  status: EscalationStatus | null;
  level: number | null;
  slaDeadline?: Date | null;
  onEscalate?: () => void;
  onResolve?: () => void;
}

export function InboxEscalationStatus(
  { status, level, slaDeadline, onEscalate, onResolve }: InboxEscalationStatusProps,
) {
  if (!status || status === "NONE") {
    return (
      <Button variant="ghost" size="sm" onClick={onEscalate} className="text-xs h-6">
        Escalate
      </Button>
    );
  }

  const isBreached = slaDeadline && new Date() > new Date(slaDeadline);

  return (
    <div className="flex items-center gap-2">
      <Badge variant={status === "RESOLVED" ? "secondary" : "destructive"} className="flex gap-1">
        {status === "ESCALATED" && <ShieldAlert className="w-3 h-3" />}
        {status === "RESOLVED" && <CheckCircle className="w-3 h-3" />}
        {status} {level ? `(L${level})` : ""}
      </Badge>

      {slaDeadline && status !== "RESOLVED" && (
        <div
          className={`text-xs flex items-center gap-1 ${
            isBreached ? "text-red-600 font-bold" : "text-gray-500"
          }`}
        >
          <Clock className="w-3 h-3" />
          {isBreached
            ? "SLA Breached"
            : `Due ${
              new Date(slaDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }`}
        </div>
      )}

      {onResolve && status !== "RESOLVED" && (
        <Button variant="outline" size="sm" onClick={onResolve} className="h-6 text-xs">
          Resolve Escalation
        </Button>
      )}
    </div>
  );
}
