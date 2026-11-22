export enum PRFileStatus {
  Added = 'added',
  Removed = 'removed',
  Modified = 'modified',
  Renamed = 'renamed',
  Copied = 'copied',
  Changed = 'changed',
  Deleted = 'deleted',
}

export const JS_TS_FILE_PATTERN = /\.(?:[cm]?[jt]s|[jt]sx)$/i;
