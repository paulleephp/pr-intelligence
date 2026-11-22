export enum PRFileStatus {
  Added = 'added',
  Removed = 'removed',
  Modified = 'modified',
  Renamed = 'renamed',
  Copied = 'copied',
  Changed = 'changed',
  Deleted = 'deleted',
}

export const MIGRATION_MODIFIED_STATUSES: readonly string[] = [
  PRFileStatus.Modified,
  PRFileStatus.Renamed,
  PRFileStatus.Changed,
];

export const DELETED_STATUSES: readonly string[] = [PRFileStatus.Removed, PRFileStatus.Deleted];

export const CHANGED_STATUSES: readonly string[] = [
  PRFileStatus.Added,
  ...MIGRATION_MODIFIED_STATUSES,
  ...DELETED_STATUSES,
];

export const JS_TS_FILE_PATTERN = /\.(?:[cm]?[jt]s|[jt]sx)$/i;
