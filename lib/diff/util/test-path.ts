import { TEST_FILE_PATTERNS } from "../constants/blast-radius";
import { TEST_PATHS } from "../constants/paths";

export const isTestPath = (filename: string): boolean => {
  const path = `/${filename.toLowerCase()}`;
  return TEST_PATHS.some((pattern) => pattern.test(path));
};

export const isTestFile = (filename: string): boolean =>
  TEST_FILE_PATTERNS.some((pattern) => pattern.test(filename));
