# Kelpie (Mermaid for To-Dos 📝)

Kelpie is an experimental, spec-driven **Markdown to-do editor** that turns GitHub-Flavored Markdown checklists into an interactive task board. It is built with **SvelteKit**, **TypeScript**, and **Vite**, and the entire product direction is documented in public specs.

> 📸 **Coming soon:** add a screenshot of the editor/preview once the UI stabilizes.

## Table of Contents
- [Features](#-features)
- [Why Markdown?](#-why-markdown)
- [Quick Start](#-quick-start)
- [Markdown Syntax Cheatsheet](#-markdown-syntax-cheatsheet)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- 🔄 Parses GitHub-Flavored Markdown checklists and syncs checkbox state bi-directionally.
- 🏷️ Supports rich task metadata via custom tags:
  - `@due(YYYY-MM-DD)` for due dates.
  - `@repeat(1w)` for recurring cadence.
  - `@priority(A|B|C)` for triage.
  - `@estimate(2h)` to track expected effort.
  - `@done(ISO8601)` for completion timestamps.
  - `#labels` for arbitrary labels.
- 🧭 Filter presets such as **Today**, **This Week**, **Overdue**, and **Completed**.
- 💾 Persists the entire document to `localStorage` for instant recovery across sessions.
- 🪟 Split-pane editor/preview with live updates.
- 🚀 Continuous deployment to GitHub Pages from the `main` branch.
- 🧪 Spec-driven development with executable specs in [`/specs`](./specs).

## 🤔 Why Markdown?

Markdown is portable, version-controlled, and approachable. Kelpie leans into that by letting you:

- Edit your source of truth anywhere (IDE, mobile notes app, etc.).
- Sync tasks through git, Gists, or any file-based workflow.
- Extend your to-do lists with structured metadata without proprietary lock-in.

## ⚡ Quick Start

Kelpie uses [`pnpm`](https://pnpm.io) for package management. Node.js **18+** is recommended.

```bash
# Install dependencies
pnpm install

# Run the dev server
pnpm dev

# Build the static site
pnpm build

# Run the unit and integration test suite
pnpm test
```

The development server defaults to `http://localhost:5173`. Vite provides hot module reloading, so edits to the app reflect immediately in the browser.

## 📝 Markdown Syntax Cheatsheet

Kelpie understands standard checklist syntax and a handful of extensions:

```markdown
- [ ] Draft launch checklist @priority(A) #launch
  - [x] Align on scope @done(2023-11-05T10:30:00Z)
  - [ ] Schedule rehearsal @due(2023-11-10)
- [ ] Weekly review @repeat(1w)
  - [ ] Review estimates @estimate(2h)
```

> Tip: Kelpie writes back completed state and metadata to your Markdown, so you can continue editing the file in your editor of choice.

## 🧱 Project Structure

```
/
├── apps/kelpie      # SvelteKit application entrypoint
├── packages/        # Shared libraries and UI components
├── specs/           # Spec-driven design documents and executable specs
├── README.md        # You're here!
└── pnpm-lock.yaml   # Deterministic dependency lockfile
```

Key directories:

- [`apps/kelpie`](./apps/kelpie): SvelteKit app including routes, components, and assets.
- [`packages`](./packages): Reusable packages (e.g., parser, UI primitives).
- [`specs`](./specs): Product and technical specs that guide development.

## 🛣 Roadmap

The detailed roadmap lives in [`specs/roadmap.spec.md`](./specs/roadmap.spec.md) and outlines the phased delivery plan:

1. **Phase 0** – MVP demo: parsing, filters, local state, CI + Pages deploy.
2. **Phase 1** – Editing ergonomics: inline tag helpers, command palette.
3. **Phase 2** – Scheduling & repeats: deeper calendar integration.
4. **Phase 3** – Multi-file workflows: import/export, cross-file search.
5. **Phase 4** – Optional sync: integrations with GitHub Gist, Google Drive, etc.

## 🤝 Contributing

We welcome pull requests! Before you start, read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup instructions, coding standards, and commit guidelines.

If you have an idea or question, feel free to open a discussion or issue. We follow a spec-first process, so proposing updates to the relevant spec is encouraged.

## 📝 License

Kelpie is open source under the [MIT License](./LICENSE).

