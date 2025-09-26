#!/usr/bin/env node
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const featureDir = path.resolve(projectRoot, "apps/web/e2e/features");
const generatedDir = path.resolve(projectRoot, "apps/web/e2e/steps/generated");
const cacheDir = path.resolve(projectRoot, ".cache");
const stampFile = path.join(cacheDir, "bddgen.timestamp");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

function ensureCacheDir() {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

function latestFeatureTimestamp() {
  if (!fs.existsSync(featureDir)) {
    return 0;
  }

  const stack = [featureDir];
  let latest = 0;

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && path.extname(entry.name) === ".feature") {
        const stats = fs.statSync(fullPath);
        latest = Math.max(latest, stats.mtimeMs);
      }
    }
  }

  return latest;
}

function needsGeneration(latestTimestamp) {
  if (!fs.existsSync(generatedDir)) {
    return true;
  }

  if (!fs.existsSync(stampFile)) {
    return true;
  }

  const cachedValue = Number.parseFloat(fs.readFileSync(stampFile, "utf8"));
  if (Number.isNaN(cachedValue)) {
    return true;
  }

  return latestTimestamp > cachedValue;
}

async function maybeGenerateSteps() {
  const latestTimestamp = latestFeatureTimestamp();
  if (!needsGeneration(latestTimestamp)) {
    return;
  }

  await run("pnpm", ["--filter", "web", "test:e2e:generate"], { cwd: projectRoot });

  ensureCacheDir();
  const timestampToPersist = latestTimestamp || Date.now();
  fs.writeFileSync(stampFile, String(timestampToPersist));
}

async function main() {
  await run("pnpm", ["spec:extract"], { cwd: projectRoot });
  await maybeGenerateSteps();
  await run("pnpm", ["--filter", "web", "exec", "playwright", "test"], {
    cwd: projectRoot,
    env: { ...process.env }
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
