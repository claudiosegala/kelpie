/// <reference types="node" />
import { defineConfig } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "e2e/features/**/*.feature",
  steps: "e2e/steps/**/*.ts"
});

export default defineConfig({
  testDir,

  // Server strategy (local vs CI)
  webServer: process.env.CI
  ? {
      command: "pnpm build && pnpm preview",
      port: 4173,
      cwd: "apps/web" // 👈 force cwd
    }
  : {
      command: "pnpm dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      cwd: "apps/web" // 👈 force cwd
    },

  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } }
    // Firefox intentionally omitted
  ]
});
