#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const specsDir = path.join(repoRoot, "specs");

if (!fs.existsSync(specsDir)) {
  console.error("specs directory not found at", specsDir);
  process.exit(1);
}

const watched = new Map();
let debounceTimer = null;
let running = false;
let rerun = false;
let childProcess = null;

const scheduleExtract = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runExtract();
  }, 150);
};

const runExtract = () => {
  if (running) {
    rerun = true;
    return;
  }

  running = true;
  childProcess = spawn("pnpm", ["spec:extract"], {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  childProcess.on("exit", (code) => {
    running = false;
    childProcess = null;
    if (code !== 0) {
      console.error(`spec:extract exited with code ${code}`);
    }
    if (rerun) {
      rerun = false;
      runExtract();
    }
  });
};

const watchDirectory = async (dir) => {
  if (watched.has(dir)) return;

  const watcher = fs.watch(dir, async (eventType, filename) => {
    if (!filename) return;
    const filePath = path.join(dir, filename);

    if (filename.endsWith(".md")) {
      scheduleExtract();
    }

    if (eventType === "rename") {
      try {
        const stats = await fsp.stat(filePath);
        if (stats.isDirectory()) {
          await watchDirectory(filePath);
        }
      } catch {
        // file was removed; ignore
      }
    }
  });

  watched.set(dir, watcher);

  const entries = await fsp.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => watchDirectory(path.join(dir, entry.name)))
  );
};

const cleanup = () => {
  for (const watcher of watched.values()) {
    watcher.close();
  }
  watched.clear();
  if (childProcess) {
    childProcess.kill();
    childProcess = null;
  }
};

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

watchDirectory(specsDir)
  .then(() => {
    console.log(`Watching ${specsDir} for Markdown spec changes...`);
    runExtract();
  })
  .catch((error) => {
    console.error("Failed to watch specs directory:", error);
    cleanup();
    process.exit(1);
  });
