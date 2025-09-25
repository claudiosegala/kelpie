
# 📗 CONTRIBUTING.md (developer-oriented)

# Contributing to Kelpie

Thanks for contributing! 🙌 This document covers everything you need to set up the project for development, run tests, and follow our conventions.

---

## 🚀 Getting started

### 1. Install prerequisites
- Node.js `>=20`
- [pnpm](https://pnpm.io/) `>=9`

### 2. Install dependencies
```bash
pnpm install
````

### 3. Run the dev server

```bash
pnpm dev

# 👉 Then open: http://localhost:5173
```

---

## 🧪 Testing

### Unit tests (Vitest + Testing Library)

```bash
pnpm test:unit
pnpm test:unit:watch
```

* Run automatically in **CI**
* Run locally before pushing for faster feedback

### End-to-end tests (Playwright + Gherkin)

```bash
# Extract .feature files from /specs/*.md
pnpm spec:extract

# Run E2E tests manually (Chromium + WebKit)
pnpm test:e2e
```

* E2E tests use **fixtures** (`apps/web/src/lib/fixtures/*.md`)
* Human-readable `.feature` files live in `/specs` (Gherkin fences)

---

## 📜 Specs & workflow

This project is **spec-driven**:

* `/specs/*.spec.md` = human-readable feature definitions
* Each spec may contain fenced ```gherkin blocks → extracted to `.feature` files for Playwright
* Roadmap, release criteria, and dev workflow live under `/specs`

Examples:

```gherkin
Feature: Toggle a task
  Scenario: Mark a task complete
    Given I open the app with "fixtures/basic.md"
    When I toggle "Buy milk"
    Then the Markdown contains "@done("
```

Run the extractor:

```bash
pnpm spec:extract
```

---

## 🧹 Linting & formatting

Run manually:

```bash
pnpm lint      # ESLint
pnpm format    # Prettier
pnpm typecheck # Strict TypeScript
```

No pre-commit hooks → **CI enforces** lint/typecheck on every PR & push.

---

## ⚙️ CI/CD

* **CI workflow (`ci.yml`)**

  * Runs lint, typecheck, unit tests, and build
  * Triggers on PRs + pushes to `main`

* **Pages workflow (`pages-deploy.yml`)**

  * Builds static SvelteKit app with `adapter-static`
  * Deploys to GitHub Pages on push to `main`

Enable in **GitHub Settings → Pages → Build and deployment → GitHub Actions**.

---

## 📂 Repo structure

```

/
├─ apps/
│  └─ web/            # SvelteKit app (UI + parsing + state)
│     ├─ src/
│     │  ├─ lib/
│     │  │  ├─ components/
│     │  │  ├─ parsing/
│     │  │  ├─ stores/
│     │  │  └─ fixtures/
│     │  └─ routes/
│     ├─ tests/
│     │  ├─ unit/     # Vitest + Testing Library
│     │  └─ e2e/      # Playwright + Gherkin
│     ├─ vite.config.ts
│     └─ playwright.config.ts
├─ packages/
│  └─ prompt-library/ # AI prompt collection (dev-only)
├─ specs/             # Spec-driven design docs (Markdown + Gherkin fences)
├─ .github/workflows/ # CI + Pages deployment
└─ README.md

````

---

## 🤖 AI integration

Dev-only, optional:

* `/packages/prompt-library/` holds reusable AI prompts
* Examples: spec validation, Gherkin generation, code refactor
* Run manually (future script: `pnpm ai:refactor`)

---

## 📖 Development guidelines

* Programming Language: **TypeScript strict**
* Backend Framework: *Not Applicable*
* Frontend Framework: **SvelteKit + runes (Svelte 5)**
* Storage: **Svelte stores** + localStorage (client-side only)
* Lint: ESLint + Prettier, run locally or via CI
* Tests: unit fast (auto/CI), E2E slower (manual/CI optional)

---

## 📦 Deployment

* Auto-deploy to **GitHub Pages** from `main`
* Static adapter (`@sveltejs/adapter-static`)
* [Later] Docs bundled with site at `/docs`
