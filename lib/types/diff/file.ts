
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
  