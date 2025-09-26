#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const env = { ...process.env };
const pluginPath = path.resolve(__dirname, "..", "apps/web/node_modules");

env.NODE_PATH = env.NODE_PATH ? `${env.NODE_PATH}${path.delimiter}${pluginPath}` : pluginPath;

const child = spawn(process.execPath, [require.resolve("prettier/bin/prettier.cjs"), ...args], {
  stdio: "inherit",
  env
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
