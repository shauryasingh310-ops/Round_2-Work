// Form validation schemas using Zod

import { z } from "zod";

// Community Report Validation
export const reportSchema = z.object({
  report_type: z.enum(["symptom", "water", "sanitation"], {
    errorMap: () => ({ message: "Please select a valid report type" }),
  }),
  region: z.string().min(2, "Region must be at least 2 characters").max(100, "Region name too long"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must not exceed 1000 characters")
    .refine(
      (val) => {
        const spamKeywords = ["buy now", "click here", "free money", "urgent", "limited time"];
        return !spamKeywords.some((keyword) => val.toLowerCase().includes(keyword));
      },
      { message: "Description contains inappropriate content" }
    ),
  anonymous: z.boolean().optional().default(false),
});

export type ReportFormData = z.infer<typeof reportSchema>;

// Location Selection Validation
export const locationSchema = z.object({
  state: z.string().min(1, "Please select a state"),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export type LocationFormData = z.infer<typeof locationSchema>;

// Preferences Validation
export const preferencesSchema = z.object({
  favoriteLocations: z.array(z.string()).default([]),
  alertThresholds: z.array(
    z.object({
      riskLevel: z.enum(["Low", "Medium", "High", "Critical"]),
      enabled: z.boolean(),
    })
  ),
  notificationsEnabled: z.boolean().default(true),
  theme: z.enum(["light", "dark", "auto"]).default("dark"),
  selectedState: z.string().optional(),
});

export type PreferencesFormData = z.infer<typeof preferencesSchema>;

// Validation helper
export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: "Validation failed" } };
  }
};

