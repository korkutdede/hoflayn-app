import { z } from "zod";
import { seoChannelIdSchema } from "./channels";
import { seoSuggestionSchema } from "./audit";

export const analyzeSeoInputSchema = z.object({
  channel: seoChannelIdSchema.optional().default("generic_web"),
});

export const applySeoFieldsSchema = z
  .object({
    title: z.boolean().optional().default(false),
    metaDescription: z.boolean().optional().default(false),
    slug: z.boolean().optional().default(false),
    primaryKeyword: z.boolean().optional().default(false),
    secondaryKeywords: z.boolean().optional().default(false),
    tagsFromKeywords: z.boolean().optional().default(false),
  })
  // Only ever surfaced as a Zod issue detail, so it stays developer-facing.
  .refine(
    (value) => Object.values(value).some(Boolean),
    "At least one field must be selected.",
  );

export const applySeoInputSchema = z.object({
  jobId: z.string().uuid().optional().nullable(),
  suggestion: seoSuggestionSchema,
  apply: applySeoFieldsSchema,
});
