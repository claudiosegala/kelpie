import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}"]
  },
  server: {
    fs: {
      allow: [
        // allow serving from workspace root and pnpm
        path.resolve(__dirname, "../../"),
        "node_modules",
      ]
    }
  }
});
