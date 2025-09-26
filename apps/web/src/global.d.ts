import matchers from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  // Merge matchers into Assertion
  type Assertion<T = unknown> = ReturnType<typeof matchers> & Assertion<T>;
}
