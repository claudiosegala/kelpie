import matchers from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  // Merge matchers into Assertion
  type Assertion<T = unknown> = ReturnType<typeof matchers> & Assertion<T>;
}

declare global {
  // Flag used by storage instrumentation utilities to toggle verbose output in tests.
  // Tests can set this flag directly on `globalThis` without TypeScript errors.
  interface GlobalThis {
    __KELPIE_STORAGE_INSTRUMENTATION__?: boolean;
  }
}

export {};
