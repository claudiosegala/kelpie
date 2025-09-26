# 📗 CONTRIBUTING.md (developer-oriented)

# Contributing to Kelpie

Thanks for contributing! 🙌 This document explains how to set up your local environment, contribute high-quality changes, and collaborate with the rest of the team. If anything is unclear, please open a docs PR so the next contributor benefits too.

---

## 📚 Table of contents

1. [Getting started](#-getting-started)
2. [VS Code setup](#-vs-code-setup)
3. [Testing](#-testing)
4. [Specs & workflow](#-specs--workflow)
5. [Linting & formatting](#-linting--formatting)
6. [CI/CD](#-cicd)
7. [Repo structure](#-repo-structure)
8. [AI integration](#-ai-integration)
9. [Development guidelines](#-development-guidelines)
10. [Issue workflow](#-issue-workflow)
11. [Pull request process](#-pull-request-process)
12. [Documentation standards](#-documentation-standards)
13. [Community expectations](#-community-expectations)

---

## 🚀 Getting started

### 1. Install prerequisites

- Node.js `>=20`
- [pnpm](https://pnpm.io/) `>=9`
- Optional: [direnv](https://direnv.net/) (or similar) to manage environment variables.

### 2. Fork & clone

```bash
git clone git@github.com:<you>/kelpie.git
cd kelpie
```

### 3. Configure Git

Use descriptive branches (e.g. `feature/spec-driven-workflow`). Enable commit signing if required by your Git host.

```bash
git config commit.gpgsign true   # optional but encouraged
```

### 4. Install dependencies

### 2. Install dependencies

```bash
pnpm install
```

# Optional: enable Husky hooks in your fork

pnpm dlx husky init

````

### 5. Run the dev server

```bash
pnpm dev

# 👉 Then open: http://localhost:5173
````

## 🧰 VS Code setup

Kelpie's toolchain is optimized for Visual Studio Code. Install the extensions below so linting, formatting, and specs all run consistently while you edit:

| Area              | Extension                                                                                                               | Identifier                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Svelte/TypeScript | [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)                          | `svelte.svelte-vscode`             |
| Linting           | [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)                                    | `dbaeumer.vscode-eslint`           |
| Formatting        | [Prettier – Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)                 | `esbenp.prettier-vscode`           |
| Styling           | [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)              | `bradlc.vscode-tailwindcss`        |
| Styling           | [PostCSS Language Support](https://marketplace.visualstudio.com/items?itemName=csstools.postcss)                        | `csstools.postcss`                 |
| Testing           | [Vitest Explorer](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer)                       | `ZixuanChen.vitest-explorer`       |
| Testing           | [Playwright Test for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)             | `ms-playwright.playwright`         |
| BDD Specs         | [Cucumber (Gherkin) Full Support](https://marketplace.visualstudio.com/items?itemName=alexkrechik.cucumberautocomplete) | `alexkrechik.cucumberautocomplete` |
| Docs              | [Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)                   | `yzhang.markdown-all-in-one`       |
| Docs              | [GitHub Markdown Preview](https://marketplace.visualstudio.com/items?itemName=bierner.github-markdown-preview)          | `bierner.github-markdown-preview`  |

Install them quickly with:

```bash
code --install-extension svelte.svelte-vscode \
  dbaeumer.vscode-eslint \
  esbenp.prettier-vscode \
  bradlc.vscode-tailwindcss \
  csstools.postcss \
  ZixuanChen.vitest-explorer \
  ms-playwright.playwright \
  alexkrechik.cucumberautocomplete \
  yzhang.markdown-all-in-one \
  bierner.github-markdown-preview
```

> Tip: Kelpie includes a `.vscode/extensions.json` file with these recommendations so VS Code will prompt collaborators to install them automatically.

---

## 🧪 Testing

### Unit tests (Vitest + Testing Library)

```bash
pnpm test:unit
pnpm test:unit:watch
```

- Run automatically in **CI**.
- Run locally before pushing for faster feedback.

### End-to-end tests (Playwright + Gherkin)

```bash
# Extract .feature files from /specs/*.md
pnpm spec:extract

# Watch Markdown specs and re-extract automatically
pnpm spec:extract:watch

# Run local E2E tests (Chromium by default)
pnpm test:e2e

# Run the full browser matrix (Chromium + WebKit)
pnpm test:e2e:all
```

- E2E tests use **fixtures** (`apps/web/src/lib/fixtures/*.md`).
- Human-readable `.feature` files live in `/specs` (Gherkin fences).
- Chromium runs in CI; WebKit is optional locally but helps catch platform differences.

### Additional checks

```bash
pnpm lint      # ESLint
pnpm format    # Prettier
pnpm typecheck # Strict TypeScript
```

Run these before opening a PR; CI will run them again for verification.

---

## 📜 Specs & workflow

This project is **spec-driven**:

- `/specs/*.spec.md` = human-readable feature definitions.
- Each spec may contain fenced ```gherkin blocks → extracted to `.feature` files for Playwright.
- Roadmap, release criteria, and dev workflow live under `/specs`.

Example:

```gherkin
Feature: Toggle a task
  Scenario: Mark a task complete
    Given I open the app with "fixtures/basic.md"
    When I toggle "Buy milk"
    Then the Markdown contains "@done("
```

Run the extractor after editing specs:

```bash
pnpm spec:extract
```

Commit the generated `.feature` files alongside the spec changes.

---

## 🧹 Linting & formatting

Run manually:

```bash
pnpm lint      # ESLint + Prettier cache via the web workspace
pnpm format    # Prettier
pnpm typecheck # Strict TypeScript
```

No pre-commit hooks → **CI enforces** lint/typecheck on every PR & push. Consider running locally before committing to shorten review cycles.

---

## ⚙️ CI/CD

- **CI workflow (`ci.yml`)**
  - Runs lint, typecheck, unit tests, and build
  - Triggers on PRs + pushes to `main`
- **Pages workflow (`pages-deploy.yml`)**
  - Builds static SvelteKit app with `adapter-static`
  - Deploys to GitHub Pages on push to `main`

Enable in **GitHub Settings → Pages → Build and deployment → GitHub Actions**. If your fork does not need deploy previews, you can disable GitHub Pages to speed up CI.

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
```

---

## 🤖 AI integration

Dev-only, optional:

- `/packages/prompt-library/` holds reusable AI prompts.
- Examples: spec validation, Gherkin generation, code refactor.
- Run manually (future script: `pnpm ai:refactor`).

---

## 📖 Development guidelines

- Programming Language: **TypeScript strict**
- Backend Framework: _Not Applicable_
- Frontend Framework: **SvelteKit + runes (Svelte 5)**
- Storage: **Svelte stores** + localStorage (client-side only)
- Lint: ESLint + Prettier, run locally or via CI
- Tests: unit fast (auto/CI), E2E slower (manual/CI optional)

---

## 🧾 Issue workflow

1. Search existing issues/specs before filing a new one.
2. For feature requests, link to or draft a spec under `/specs` that captures the user story, acceptance criteria, and Gherkin examples.
3. Label issues with `bug`, `feature`, `docs`, etc. so the board stays organized.
4. Assign yourself before starting work to avoid duplicate efforts.

### Grooming checklist

- [ ] Spec updated or confirmed relevant.
- [ ] Acceptance criteria and edge cases captured.
- [ ] Tests identified (unit, e2e, manual QA).

---

## 🔀 Pull request process

1. Keep PRs focused. Small, reviewable changes merge faster.
2. Reference the related issue or spec in the PR description.
3. Include screenshots or terminal output for UI or CLI changes.
4. Ensure `pnpm lint`, `pnpm typecheck`, and relevant tests pass locally.
5. When touching specs, run `pnpm spec:extract` and commit the generated `.feature` files.
6. Request review from a maintainer or your pairing partner.
7. After approval, squash-merge unless the commit history is intentionally curated.

### Commit message convention

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Examples:

```
feat: add recurring task toggle
fix: correct parsing of @done metadata
docs: clarify e2e setup instructions
```

---

## 📝 Documentation standards

- Update `README.md` and relevant `/specs/*.md` when behavior changes.
- Prefer diagrams or tables over long paragraphs when describing flows.
- For new components, add stories or usage examples in `apps/web/src/lib/components`.
- Use inclusive language; avoid idioms that may confuse non-native English speakers.

---

## 🤝 Community expectations

We strive for a collaborative, respectful environment. By participating you agree to uphold our Code of Conduct (coming soon). If you encounter harmful behavior, contact the maintainers privately.
