#!/usr/bin/env node
const { spawn } = require("child_process");

const processes = [];
let shuttingDown = false;

function run(command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  processes.push(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    // If one of the processes exits, terminate the rest and exit with the same code.
    for (const proc of processes) {
      if (proc !== child && !proc.killed) {
        proc.kill("SIGINT");
      }
    }

    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 1);
    }
  });

  return child;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
process.once("exit", shutdown);

run("pnpm", ["dev"]);
run("pnpm", ["spec:extract:watch"]);
