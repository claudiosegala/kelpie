# Developer Experience Improvements

## Context
Kelpie already leans on a spec-driven workflow with dedicated scripts for formatting, linting, spec extraction, unit tests, and Playwright BDD flows. The suggestions below focus on tying those pieces together so contributors can move faster with fewer manual steps.

## Suggestions

### 1. Offer a "spec-aware" dev loop
*Observation.* The workspace exposes `dev` and `spec:extract:watch` scripts separately; the latter spawns the Markdown extractor whenever specs change.
*Recommendation.* Add a convenience script (for example `pnpm dev:specs`) that runs the SvelteKit dev server alongside `spec:extract:watch` using `pnpm --parallel` or a lightweight process manager. That keeps the generated feature files in sync during feature work without an extra terminal tab.

### 2. Restore a real `test:unit:watch` target
*Observation.* The root `test:unit:watch` script proxies to the `web` package, but `apps/web/package.json` does not currently define a matching command.
*Recommendation.* Add a `test:unit:watch` script in `apps/web/package.json` that runs `vitest --watch` (or `vitest --ui`). This lines up the root script with the package-level tooling and gives contributors an easy long-running unit test loop.

### 3. Speed up Playwright BDD runs with cached generation
*Observation.* The `web` package’s `test:e2e` script regenerates cucumber step definitions on every run via `bddgen` before launching Playwright.
*Recommendation.* Wrap `bddgen` in a simple timestamp-aware cache (for example, only regenerate when feature files under `e2e/` change) so local reruns skip the expensive generation step. That could live in `scripts/run-e2e.js` alongside the existing browser selection logic.

### 4. Codify common dev tasks for editors
*Observation.* The repo already defines VS Code defaults for formatting and ESLint, but there are no workspace tasks that mirror the pnpm scripts.
*Recommendation.* Add a `.vscode/tasks.json` that exposes shortcuts for `pnpm dev`, `pnpm dev:specs`, `pnpm test:unit:watch`, and `pnpm test:e2e`. This gives contributors single-keystroke access to the common loops and keeps the project’s recommended workflows visible.
