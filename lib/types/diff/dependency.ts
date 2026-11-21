export interface DependencyChanges {
  added: string[];
  removed: string[];
  upgraded: string[];
  evidence: string | null;
}
