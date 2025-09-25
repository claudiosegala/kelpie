import matchers from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  // Merge matchers into Assertion
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  type Assertion<T = unknown> = ReturnType<typeof matchers> & Assertion<T>;
}
