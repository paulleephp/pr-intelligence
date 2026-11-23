import { z } from "zod";
import { PR_STATUS_MAP } from "@/lib/github/constants";
import type { PRMetadata } from "@/types/pr/metdata";

const repoRefSchema = z.object({ url: z.string() });

export const prMetadataSchema = z.object({
  number: z.int().positive(),
  title: z.string(),
  state: z.enum(PR_STATUS_MAP),
  user: z.object({
    login: z.string(),
    avatar_url: z.string(),
    html_url: z.string(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  mergeable: z.boolean().nullable(),
  labels: z.array(z.object({ name: z.string(), color: z.string() })),
  head: z.object({ repo: repoRefSchema }),
  base: z.object({ repo: repoRefSchema, ref: z.string() }),
  html_url: z.string(),
}) satisfies z.ZodType<PRMetadata>;
