const BINARY_DIFF_MARKER = /^Binary files .* differ$/m;
const NULL_BYTE = "\0";

export function isBinaryFile(patch: string | null | undefined): boolean {
  if (!patch) {
    return true;
  }
  return BINARY_DIFF_MARKER.test(patch) || patch.includes(NULL_BYTE);
}
