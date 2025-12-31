import { z } from "zod";

export const MONETIZATION_MODELS = [
  "free",
  "freemium",
  "subscription",
  "one-time",
  "usage-based",
] as const;

export const appCreationSchema = z.object({
  name: z
    .string()
    .min(3, "App name must be at least 3 characters")
    .max(50, "App name must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9\s-]+$/,
      "App name can only contain letters, numbers, spaces, and hyphens",
    ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters"),
  requirements: z
    .string()
    .min(20, "Requirements must be at least 20 characters")
    .max(2000, "Requirements must be less than 2000 characters"),
  monetizationModel: z.enum(MONETIZATION_MODELS, {
    message: "Please select a monetization model",
  }),
  codespaceId: z
    .string()
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Codespace ID can only contain letters, numbers, hyphens, and underscores",
    )
    .max(100)
    .optional(),
});

// Schema for linking a codespace to an existing app (PATCH operation)
export const appCodespaceLinkSchema = z.object({
  codespaceId: z
    .string()
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Codespace ID can only contain letters, numbers, hyphens, and underscores",
    )
    .max(100),
});

export type AppCreationFormData = z.infer<typeof appCreationSchema>;

export const step1Schema = appCreationSchema.pick({
  name: true,
  description: true,
});

export const step2Schema = appCreationSchema.pick({
  requirements: true,
});

export const step3Schema = appCreationSchema.pick({
  monetizationModel: true,
});
