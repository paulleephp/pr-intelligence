import type { BlastRadiusLevel, LevelThresholds } from "@/lib/types/diff/blast-radius";
import { PRFileStatus } from "./file";

export const BLAST_RADIUS_LEVELS = ["contained", "moderate", "wide"] as const satisfies readonly BlastRadiusLevel[];

export const FILE_COUNT_THRESHOLDS: LevelThresholds = { contained: 10, moderate: 30 };

export const SPREAD_THRESHOLDS: LevelThresholds = { contained: 1, moderate: 3 };

export const CONTAINER_FOLDERS: ReadonlySet<string> = new Set([
  "src",
  "lib",
  "app",
  "packages",
  "apps",
  "libs",
  "services",
  "modules",
]);

export const ROOT_MODULE = "(root)";

export const LOCKFILES: ReadonlySet<string> = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "npm-shrinkwrap.json",
  "bun.lockb",
]);

export const SNAPSHOT_PATTERNS: readonly RegExp[] = [/\.snap$/i, /(?:^|\/)__snapshots__\//i];

export const ASSET_EXTENSIONS: ReadonlySet<string> = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "svg",
  "ico",
  "bmp",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "mp4",
  "webm",
  "mov",
  "mp3",
  "wav",
  "pdf",
  "zip",
  "gz",
  "tar",
]);

export const DOCS_PATTERNS: readonly RegExp[] = [/\.mdx?$/i, /^docs\//i];

export const TEST_FILE_PATTERNS: readonly RegExp[] = [
  /\.(?:test|spec)\.[^/]+$/i,
  /(?:^|\/)(?:__tests__|tests?|e2e)\//i,
];

export const FIXTURE_PATTERN = /(?:^|\/)fixtures\//i;

export const TEST_SIGNAL_STATUSES: readonly string[] = [
  PRFileStatus.Added,
  PRFileStatus.Modified,
  PRFileStatus.Renamed,
];
