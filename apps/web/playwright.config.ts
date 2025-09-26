/// <reference types="node" />
import { defineConfig } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "e2e/features/**/*.feature",
  steps: "e2e/steps/**/*.ts"
});

const availableProjects = [
  { name: "chromium", use: { browserName: "chromium" } },
  { name: "webkit", use: { browserName: "webkit" } }
  // Firefox intentionally omitted
];

const defaultBrowsers = process.env.CI ? "chromium,webkit" : "chromium";

const requestedBrowsers = (process.env.PLAYWRIGHT_BROWSERS ?? defaultBrowsers)
  .split(",")
  .map((browser) => browser.trim().toLowerCase())
  .filter(Boolean);

const filteredProjects =
  requestedBrowsers.length > 0
    ? availableProjects.filter((project) => requestedBrowsers.includes(project.name.toLowerCase()))
    : availableProjects;

const projects = filteredProjects.length > 0 ? filteredProjects : availableProjects;

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
  projects
});
