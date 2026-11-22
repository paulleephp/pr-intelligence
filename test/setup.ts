import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// RTL only auto-cleans when Vitest globals are detected at import time; be explicit.
afterEach(() => {
  cleanup();
});
