import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  targetAudienceSchema,
  campaignObjectivesSchema,
} from "@/lib/validation/brief";
import { z } from "zod";

type TargetAudience = z.infer<typeof targetAudienceSchema>;
type CampaignObjectives = z.infer<typeof campaignObjectivesSchema>;

interface BriefState {
  step: number;
  targetAudience: Partial<TargetAudience>;
  campaignObjectives: Partial<CampaignObjectives>;
  setStep: (step: number) => void;
  setTargetAudience: (data: TargetAudience) => void;
  setCampaignObjectives: (data: CampaignObjectives) => void;
  reset: () => void;
}

const initialState = {
  step: 1,
  targetAudience: {},
  campaignObjectives: {},
};

export const useBriefStore = create<BriefState>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setTargetAudience: (data) => set((state) => ({ ...state, targetAudience: data })),
      setCampaignObjectives: (data) => set((state) => ({ ...state, campaignObjectives: data })),
      reset: () => set(initialState),
    }),
    {
      name: "campaign-brief", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
