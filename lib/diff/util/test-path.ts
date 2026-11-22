import { TEST_PATHS } from "../constants/paths";

export const isTestPath = (filename: string): boolean => {
  const path = `/${filename.toLowerCase()}`;
  return TEST_PATHS.some((pattern) => pattern.test(path));
};
