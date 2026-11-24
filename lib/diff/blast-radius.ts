import { BLAST_RADIUS_LEVELS } from "@/lib/schemas/constants";
import type {
  BlastRadius,
  BlastRadiusFileCount,
  BlastRadiusLevel,
  BlastRadiusSpread,
  BlastRadiusTests,
  LevelThresholds,
} from "@/lib/types/diff/blast-radius";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import {
  ASSET_EXTENSIONS,
  CONTAINER_FOLDERS,
  DOCS_PATTERNS,
  FILE_COUNT_THRESHOLDS,
  FIXTURE_PATTERN,
  LOCKFILES,
  ROOT_MODULE,
  SNAPSHOT_PATTERNS,
  SPREAD_THRESHOLDS,
  TEST_SIGNAL_STATUSES,
} from "./constants/blast-radius";
import { JS_TS_FILE_PATTERN, PRFileStatus } from "./constants/file";
import { isBinaryFile } from "./util/is-binary";
import { isTestFile } from "./util/test-path";

const basename = (filename: string): string => filename.slice(filename.lastIndexOf("/") + 1);

const extension = (filename: string): string => {
  const name = basename(filename);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

const matchesAny = (patterns: readonly RegExp[], filename: string): boolean =>
  patterns.some((pattern) => pattern.test(filename));

const hasNoContentChange = ({ patch, additions, deletions }: ChangedFile): boolean =>
  !patch && !additions && !deletions;

const isExcludedFromCount = (file: ChangedFile): boolean => {
  const { filename, patch, status } = file;
  return (
    status === PRFileStatus.Unchanged ||
    hasNoContentChange(file) ||
    LOCKFILES.has(basename(filename).toLowerCase()) ||
    matchesAny(SNAPSHOT_PATTERNS, filename) ||
    ASSET_EXTENSIONS.has(extension(filename)) ||
    (Boolean(patch) && isBinaryFile(patch))
  );
};

const isExcludedFromSpread = (filename: string): boolean =>
  isTestFile(filename) || FIXTURE_PATTERN.test(filename) || matchesAny(DOCS_PATTERNS, filename);

const byCaseInsensitiveName = (a: string, b: string): number =>
  a.toLowerCase().localeCompare(b.toLowerCase());

const toLevel = (value: number, { contained, moderate }: LevelThresholds): BlastRadiusLevel => {
  if (value <= contained) return "contained";
  return value <= moderate ? "moderate" : "wide";
};

const higherLevel = (a: BlastRadiusLevel, b: BlastRadiusLevel): BlastRadiusLevel =>
  BLAST_RADIUS_LEVELS.indexOf(a) >= BLAST_RADIUS_LEVELS.indexOf(b) ? a : b;

export const getModule = (filename: string): string => {
  const folders = filename.split("/").slice(0, -1);
  const [first, second] = folders;
  if (!first) return ROOT_MODULE;
  const isContainer = CONTAINER_FOLDERS.has(first.toLowerCase());
  return isContainer && second ? `${first}/${second}` : first;
};

const getFileCount = (files: ChangedFile[], countedFiles: ChangedFile[]): BlastRadiusFileCount => {
  const counted = countedFiles.length;
  const excluded = files.length - counted;
  const level = toLevel(counted, FILE_COUNT_THRESHOLDS);
  return { counted, excluded, level };
};

const getSpread = (countedFiles: ChangedFile[]): BlastRadiusSpread => {
  const spreadFiles = countedFiles.filter(({ filename }) => !isExcludedFromSpread(filename));
  const moduleByKey = new Map<string, string>();
  for (const { filename } of spreadFiles) {
    const module = getModule(filename);
    const key = module.toLowerCase();
    if (!moduleByKey.has(key)) moduleByKey.set(key, module);
  }
  const modules = [...moduleByKey.values()].sort(byCaseInsensitiveName);
  const level = toLevel(modules.length, SPREAD_THRESHOLDS);
  return { modules, level };
};

const getTests = (files: ChangedFile[]): BlastRadiusTests => {
  const jsTsFiles = files.filter(
    ({ filename, status }) =>
      TEST_SIGNAL_STATUSES.includes(status) &&
      JS_TS_FILE_PATTERN.test(filename) &&
      !FIXTURE_PATTERN.test(filename),
  );
  const testFiles = jsTsFiles.filter(({ filename }) => isTestFile(filename)).length;
  const sourceFiles = jsTsFiles.length - testFiles;

  if (sourceFiles === 0) return { state: "no-source-changes", sourceFiles, testFiles };
  const state = testFiles === 0 ? "no-tests" : "tests-changed";
  return { state, sourceFiles, testFiles };
};

export const getBlastRadius = (files: ChangedFile[]): BlastRadius => {
  const countedFiles = files.filter((file) => !isExcludedFromCount(file));
  const fileCount = getFileCount(files, countedFiles);
  const spread = getSpread(countedFiles);
  const tests = getTests(files);
  const level = higherLevel(fileCount.level, spread.level);
  return { level, fileCount, spread, tests };
};
