# Mermaid for To-Dos 📝

> MVP of a **Markdown-driven to-do app** (“Mermaid for to-dos”) built with **SvelteKit + TypeScript + Vite**, using **spec-driven design**.
> Users paste or edit GitHub-Flavored Markdown with checkboxes + tags (`@due`, `@repeat`, `@priority`, etc.), and the UI renders it interactively.

---

## ✨ Features (MVP)

- 🔄 Parse and render GitHub-Flavored Markdown checklists
- 🔄 Custom task tags:
  - `@due(YYYY-MM-DD)`
  - `@repeat(1w)`
  - `@priority(A|B|C)`
  - `@estimate(2h)`
  - `@done(ISO8601)`
  - `#tags`
- 🔄 Local persistence (LocalStorage)
- 🔄 Split editor/preview view
- 🔄 Filters: *Today*, *This Week*, *Overdue*, *Completed*
- 🔄 Open source from day one, deployed on GitHub Pages

---

## 🛣 Roadmap (phased)

See [`specs/roadmap.spec.md`](./specs/roadmap.spec.md).

* **Phase 0:** MVP demo (parsing, filters, local state, CI + Pages deploy)
* **Phase 1:** Editing ergonomics (inline tag helpers, command palette)
* **Phase 2:** Scheduling & repeats
* **Phase 3:** Multi-file & import/export
* **Phase 4:** Optional sync (GitHub Gist, Drive, …)


---

## 📝 License
MIT — see [LICENSE](./LICENSE).

---

## 🤝 Contributing

Want to help? Awesome! 🎉
See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, dev workflow, testing, and commit guidelines.


