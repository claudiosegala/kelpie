#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const hookDir = path.resolve(__dirname, "..", ".husky");

if (!fs.existsSync(hookDir)) {
  process.exit(0);
}

try {
  execSync("git rev-parse --git-dir", { stdio: "ignore" });
} catch (error) {
  console.warn("Skipping git hook setup because this is not a git repository.", error.message);
  process.exit(0);
}

try {
  execSync("git config core.hooksPath .husky", { stdio: "ignore" });
  console.log("Configured git hooks path to use .husky");
} catch (error) {
  console.warn("Failed to configure git hooks path automatically:", error.message);
}
