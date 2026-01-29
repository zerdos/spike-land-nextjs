import type {
  campaignObjectivesSchema,
  creativeRequirementsSchema,
  targetAudienceSchema
} from "@/lib/validation/brief";
import type { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type TargetAudience = z.infer<typeof targetAudienceSchema>;
type CampaignObjectives = z.infer<typeof campaignObjectivesSchema>;
type CreativeRequirements = z.infer<typeof creativeRequirementsSchema>;

interface BriefState {
  step: number;
  briefName: string;
  targetAudience: Partial<TargetAudience>;
  campaignObjectives: Partial<CampaignObjectives>;
  creativeRequirements: Partial<CreativeRequirements>;
  briefId?: string | null;
  setStep: (step: number) => void;
  setBriefName: (name: string) => void;
  setTargetAudience: (data: TargetAudience) => void;
  setCampaignObjectives: (data: CampaignObjectives) => void;
  setCreativeRequirements: (data: CreativeRequirements) => void;
  setBriefId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  step: 1,
  briefName: "",
  targetAudience: {},
  campaignObjectives: {},
  creativeRequirements: {},
  briefId: null,
};

export const useBriefStore = create<BriefState>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setBriefName: (name) => set({ briefName: name }),
      setTargetAudience: (data) => set((state) => ({ ...state, targetAudience: data })),
      setCampaignObjectives: (data) => set((state) => ({ ...state, campaignObjectives: data })),
      setCreativeRequirements: (data) => set((state) => ({ ...state, creativeRequirements: data })),
      setBriefId: (id) => set({ briefId: id }),
      reset: () => set(initialState),
    }),
    {
      name: "campaign-brief", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    },
  ),
);
