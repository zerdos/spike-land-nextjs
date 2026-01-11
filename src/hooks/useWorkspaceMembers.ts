import { useQuery } from "@tanstack/react-query";

interface WorkspaceMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export function useWorkspaceMembers(workspaceSlug: string) {
  return useQuery({
    queryKey: ["workspaceMembers", workspaceSlug],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const response = await fetch(`/api/orbit/${workspaceSlug}/members`);
      if (!response.ok) {
        throw new Error("Failed to fetch workspace members");
      }
      return response.json();
    },
    enabled: !!workspaceSlug,
  });
}
