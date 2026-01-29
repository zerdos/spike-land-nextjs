import { z } from "zod";

export const targetAudienceSchema = z.object({
  demographics: z.object({
    ageRange: z.string().min(1, "Age range is required."),
    gender: z.string().min(1, "Gender is required."),
    location: z.string().min(1, "Location is required."),
  }),
  interests: z.array(z.string()).min(1, "At least one interest is required."),
  behaviors: z.array(z.string()).min(1, "At least one behavior is required."),
});

export const campaignObjectivesSchema = z.object({
  objective: z.string().min(1, "Objective is required."),
  kpis: z.array(z.string()).min(1, "At least one KPI is required."),
  successMetrics: z.string().min(1, "Success metrics are required."),
  deadline: z.date().optional(),
});

export const creativeRequirementsSchema = z.object({
  platforms: z.array(z.enum(["FACEBOOK", "INSTAGRAM", "GOOGLE_ADS", "LINKEDIN", "TWITTER"])).min(1, "At least one platform is required."),
  formats: z.array(z.enum(["IMAGE", "VIDEO", "CAROUSEL", "STORY"])).min(1, "At least one format is required."),
  toneOfVoice: z.string().min(1, "Tone of voice is required."),
  brandGuidelines: z.string().optional(),
  colorPalette: z.array(z.string()).optional(),
  mustInclude: z.array(z.string()).optional(),
  mustAvoid: z.array(z.string()).optional(),
});

export const completeBriefSchema = z.object({
  name: z.string().min(1, "Brief name is required."),
  targetAudience: targetAudienceSchema,
  campaignObjectives: campaignObjectivesSchema,
  creativeRequirements: creativeRequirementsSchema,
});
