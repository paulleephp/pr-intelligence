import type {
  BlastRadiusFileCount,
  BlastRadiusLevel,
  BlastRadiusTests,
  TestSignalState,
} from "@/lib/types/diff/blast-radius";
import type { ModuleSplit } from "@/types/ui/report";
import { SEVERITY_STYLES } from "./severity";

export const MODULE_PREVIEW_LIMIT = 6;

export const LEVEL_BADGE_STYLE = SEVERITY_STYLES.none.badge;

export const WARNING_TEXT_STYLE = SEVERITY_STYLES.medium.text;

export const BLAST_RADIUS_LEVEL_LABELS: Readonly<Record<BlastRadiusLevel, string>> = {
  contained: "Contained",
  moderate: "Moderate",
  wide: "Wide",
};

export const NO_MODULES_LABEL = "No modules";

export const SHOW_LESS_LABEL = "Show less";

export const EXCLUDED_FILES_HINT =
  "Not counted: lockfiles, test snapshots, images and other assets, files with no diff (binaries, empty files, renames without changes) and unchanged files";

export const pluralize = (count: number, singular: string): string =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

const TEST_SIGNAL_TEXT: Readonly<Record<TestSignalState, (tests: BlastRadiusTests) => string>> = {
  "no-source-changes": () => "No source changes",
  "no-tests": ({ sourceFiles }) => `No tests changed for ${pluralize(sourceFiles, "source file")}`,
  "tests-changed": ({ testFiles, sourceFiles }) =>
    `${pluralize(testFiles, "test file")} changed for ${pluralize(sourceFiles, "source file")}`,
};

export const describeFileCount = ({ counted, excluded }: BlastRadiusFileCount): string => {
  const files = pluralize(counted, "file");
  return excluded > 0 ? `${files} · ${excluded} excluded` : files;
};

export const describeSpread = (modules: readonly string[]): string =>
  modules.length === 0 ? NO_MODULES_LABEL : pluralize(modules.length, "module");

export const describeTests = (tests: BlastRadiusTests): string =>
  TEST_SIGNAL_TEXT[tests.state](tests);

export const isTestWarning = ({ state }: BlastRadiusTests): boolean => state === "no-tests";

export const splitModules = (modules: readonly string[]): ModuleSplit => ({
  shown: modules.slice(0, MODULE_PREVIEW_LIMIT),
  hidden: modules.slice(MODULE_PREVIEW_LIMIT),
});
