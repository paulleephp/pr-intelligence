/**
 * File status in a diff
 */
export type FileStatus = "added" | "removed" | "modified" | "renamed";

/**
 * File category type
 */
export type FileCategory = 
  | "code"
  | "test"
  | "docs"
  | "config"
  | "dependency"
  | "build"
  | "infrastructure";

