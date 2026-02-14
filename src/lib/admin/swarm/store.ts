import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EnvironmentName } from "./types";

interface SwarmStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeEnvironment: EnvironmentName | "all";
  setActiveEnvironment: (env: EnvironmentName | "all") => void;
}

export const useSwarmStore = create<SwarmStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      activeEnvironment: "all",
      setActiveEnvironment: (env) => set({ activeEnvironment: env }),
    }),
    { name: "swarm-ui-state" },
  ),
);
