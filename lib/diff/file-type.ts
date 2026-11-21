import type { FileType } from "@/types/diff/file-type";
import {
  CONFIG_BASENAMES,
  CONFIG_EXTENSIONS,
  CONFIG_NAME_MARKERS,
  DOC_EXTENSIONS,
  DOC_PATHS,
  FRONTEND_EXTENSIONS,
  FRONTEND_PATHS,
} from "./constants/file-type";
import { TEST_PATHS } from "./constants/paths";

const getExtension = (basename: string): string => {
  const dot = basename.lastIndexOf(".");
  return dot > 0 ? basename.slice(dot) : "";
};

export const getFileType = (rawFilename: string): FileType => {
  const path = `/${rawFilename.toLowerCase()}`;
  const basename = path.slice(path.lastIndexOf("/") + 1);
  const extension = getExtension(basename);

  if (TEST_PATHS.some((p) => path.includes(p))) {
    return "tests";
  }
  if (DOC_EXTENSIONS.includes(extension) || DOC_PATHS.some((p) => path.includes(p))) {
    return "docs";
  }
  if (
    CONFIG_EXTENSIONS.includes(extension) ||
    CONFIG_BASENAMES.includes(basename) ||
    CONFIG_NAME_MARKERS.some((m) => basename.includes(m)) ||
    basename.startsWith(".env")
  ) {
    return "config";
  }
  if (FRONTEND_EXTENSIONS.includes(extension) || FRONTEND_PATHS.some((p) => path.includes(p))) {
    return "frontend";
  }
  return "backend";
};
