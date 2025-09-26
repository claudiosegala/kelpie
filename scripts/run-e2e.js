#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, spawnSync } = require("child_process");

const args = process.argv.slice(2);
const env = { ...process.env };

const browserArg = args.find((value) => value.startsWith("--browsers="));
if (browserArg) {
  env.PLAYWRIGHT_BROWSERS = browserArg.split("=")[1];
} else if (args[0]) {
  env.PLAYWRIGHT_BROWSERS = args[0];
}

if (!env.PLAYWRIGHT_BROWSERS) {
  env.PLAYWRIGHT_BROWSERS = env.CI ? "chromium,webkit" : "chromium";
}

const installResult = spawnSync("pnpm", ["exec", "playwright", "install"], {
  stdio: "inherit",
  env
});

if (installResult.status !== 0) {
  process.exit(installResult.status ?? 1);
}

const child = spawn("pnpm", ["--filter", "web", "test:e2e"], {
  stdio: "inherit",
  env
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
