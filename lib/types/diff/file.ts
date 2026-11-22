
export type FileType = "frontend" | "backend" | "tests" | "docs" | "config";

export type FileCategory = 
  | "code"
  | "test"
  | "docs"
  | "config"
  | "dependency"
  | "build"
  | "infrastructure";

export type PRFileStatus =
  | "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied"
  | "changed"
  | "deleted";
  