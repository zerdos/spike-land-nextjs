export type RequirementPriority = "high" | "medium" | "low";
export type RequirementStatus = "pending" | "in-progress" | "completed";

export interface Requirement {
  id: string;
  text: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequirementsManagerProps {
  requirements: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
  maxRequirements?: number;
  allowReorder?: boolean;
  readonly?: boolean;
}
