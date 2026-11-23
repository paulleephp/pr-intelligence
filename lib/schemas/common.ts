import { z } from "zod";
import type { Pattern } from "@/lib/types/diff/pattern";
import { PATTERN_SEVERITIES } from "./constants";

export const countSchema = z.int().nonnegative();

export const severitySchema = z.enum(PATTERN_SEVERITIES);

export const patternSchema = z.object({
  ruleId: z.string(),
  severity: severitySchema,
  filename: z.string(),
  message: z.string(),
  evidence: z.string().optional(),
}) satisfies z.ZodType<Pattern>;

export const errorBodySchema = z.object({ error: z.string() });
