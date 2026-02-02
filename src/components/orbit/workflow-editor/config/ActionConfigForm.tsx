import type { WorkflowNode } from "../types";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ActionConfigFormProps {
  node: WorkflowNode;
  onChange: (data: unknown) => void;
}

const ActionConfigForm = ({ node, onChange }: ActionConfigFormProps) => {
  const config = (node.data.config || {}) as Record<string, unknown>;

  const handleChange = (field: string, value: unknown) => {
    onChange({
      ...node.data,
      config: {
        ...config,
        [field]: value,
      },
    });
  };

  const actionType = (config.actionType as string) || "send_notification";
  const message = (config.message as string) || "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="action-type">Action Type</Label>
        <Select
          value={actionType}
          onValueChange={(val) => handleChange("actionType", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="send_notification">Send Notification</SelectItem>
            <SelectItem value="http_request">HTTP Request</SelectItem>
            <SelectItem value="call_ai_agent">Call AI Agent</SelectItem>
            {/* Add more as we implement them */}
          </SelectContent>
        </Select>
      </div>

      {actionType === "send_notification" && (
         <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
                value={message}
                onChange={(e) => handleChange("message", e.target.value)}
                placeholder="Enter notification message"
            />
         </div>
      )}
    </div>
  );
};

export default ActionConfigForm;
