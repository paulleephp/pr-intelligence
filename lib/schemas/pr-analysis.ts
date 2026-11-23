import { z } from "zod";
import { PRFileStatus } from "@/lib/diff/constants/file";
import type { PrChangeSummary } from "@/lib/types/diff/summary";
import type {
  CategoryAnalysis,
  ChangedFile,
  CodeAnalysis,
  PRAggregate,
  PRAnalysisResponse,
  SecretAnalysis,
  UnscannedFile,
} from "@/lib/types/pr/metadata";
import { countSchema, patternSchema, severitySchema } from "./common";
import { FILE_TYPES, UNSCANNED_REASONS } from "./constants";

const optionalPattern = patternSchema.nullable();

const changedFileSchema = z.object({
  filename: z.string(),
  status: z.enum(PRFileStatus),
  additions: countSchema,
  deletions: countSchema,
  patch: z.string(),
}) satisfies z.ZodType<ChangedFile>;

const changeSummarySchema = z.object({
  filesChanged: countSchema,
  totalLinesAdded: countSchema,
  totalLinesRemoved: countSchema,
  filesAdded: countSchema,
  filesRemoved: countSchema,
}) satisfies z.ZodType<PrChangeSummary>;

const unscannedFileSchema = z.object({
  filename: z.string(),
  reason: z.enum(UNSCANNED_REASONS),
}) satisfies z.ZodType<UnscannedFile>;

const secretAnalysisSchema = z.object({
  filename: z.string(),
  secret: optionalPattern,
  apiKey: optionalPattern,
  password: optionalPattern,
  ssh: optionalPattern,
}) satisfies z.ZodType<SecretAnalysis>;

const categoryAnalysisSchema = z.object({
  filename: z.string(),
  category: z.array(patternSchema),
}) satisfies z.ZodType<CategoryAnalysis>;

const codeAnalysisSchema = z.object({
  filename: z.string(),
  authPatterns: optionalPattern,
  passwordHashingPatterns: optionalPattern,
  cryptoAlgoPatterns: optionalPattern,
  prodConfigChanges: optionalPattern,
  riskyApiCalls: optionalPattern,
  dangerousCodeCalls: optionalPattern,
  dependencyChanges: optionalPattern,
}) satisfies z.ZodType<CodeAnalysis>;

const severityCountsSchema = z.record(severitySchema, countSchema);

const aggregateSchema = z.object({
  findings: z.array(patternSchema),
  totalFindings: countSchema,
  severityCounts: severityCountsSchema,
  ruleCounts: z.array(
    z.object({
      ruleId: z.string(),
      condition: z.string(),
      severity: severitySchema,
      count: countSchema,
    }),
  ),
  fileSeverity: z.record(z.string(), severitySchema),
  fileSeverityCounts: severityCountsSchema,
  overallSeverity: severitySchema.nullable(),
}) satisfies z.ZodType<PRAggregate>;

export const prAnalysisResponseSchema = z.object({
  changedFiles: z.array(changedFileSchema),
  prChangeSummary: changeSummarySchema,
  analysis: z.object({
    unscannedFiles: z.array(unscannedFileSchema),
    secret: z.array(secretAnalysisSchema),
    category: z.array(categoryAnalysisSchema),
    code: z.array(codeAnalysisSchema),
    fileTypes: z.record(z.string(), z.enum(FILE_TYPES)),
    aggregate: aggregateSchema,
  }),
}) satisfies z.ZodType<PRAnalysisResponse>;
