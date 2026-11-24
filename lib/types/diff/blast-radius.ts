export type BlastRadiusLevel = "contained" | "moderate" | "wide";

export type TestSignalState = "no-source-changes" | "no-tests" | "tests-changed";

export interface BlastRadiusFileCount {
  counted: number;
  excluded: number;
  level: BlastRadiusLevel;
}

export interface BlastRadiusSpread {
  modules: string[];
  level: BlastRadiusLevel;
}

export interface BlastRadiusTests {
  state: TestSignalState;
  sourceFiles: number;
  testFiles: number;
}

export interface BlastRadius {
  level: BlastRadiusLevel;
  fileCount: BlastRadiusFileCount;
  spread: BlastRadiusSpread;
  tests: BlastRadiusTests;
}

export interface LevelThresholds {
  contained: number;
  moderate: number;
}
