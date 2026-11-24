import { z } from "zod";
import { BLAST_RADIUS_LEVELS } from "@/lib/diff/constants/blast-radius";
import type { BlastRadius } from "@/lib/types/diff/blast-radius";
import { countSchema } from "./common";
import { TEST_SIGNAL_STATES } from "./constants";

const levelSchema = z.enum(BLAST_RADIUS_LEVELS);

export const blastRadiusSchema = z.object({
  level: levelSchema,
  fileCount: z.object({
    counted: countSchema,
    excluded: countSchema,
    level: levelSchema,
  }),
  spread: z.object({
    modules: z.array(z.string()),
    level: levelSchema,
  }),
  tests: z.object({
    state: z.enum(TEST_SIGNAL_STATES),
    sourceFiles: countSchema,
    testFiles: countSchema,
  }),
}) satisfies z.ZodType<BlastRadius>;
