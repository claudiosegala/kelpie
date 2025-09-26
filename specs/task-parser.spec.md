# Task Parser Spec

## 1. Introduction

The **Task Parser** turns Markdown checklist lines into structured `Task` records that power the editor, preview, and storage
layers. Parsing must be permissive enough to reflect user-authored Markdown while still emitting a canonical representation that
other subsystems can rely on.

## 2. Outcomes

- **For users**
  - Markdown written in their editor of choice is recognised as tasks even when checkbox spacing or bullet markers vary.
  - Parsed tasks are normalised back to a consistent `- [ ]` / `- [x]` format before rendering, so documents stay tidy.
  - Common metadata tags (`@due`, `@repeat`, etc.) always round-trip without being lost.
- **For developers**
  - Have a predictable contract for how task lines are tokenised, including the complete list of first-class tags.
  - Extend parsing rules without breaking downstream consumers by relying on the canonical formatter.
  - Confidently add future behaviour such as nested subtasks with clear depth limits.

## 3. Current Behaviour

- A task line matches optional indentation, a bullet marker (`-`, `*`, or `+`), optional whitespace, and a checkbox with any
  combination of spaces and a single `x`/`X` inside (e.g., `- []`, `* [ x ]`, `+ [    X    ]`).
- The parser trims the text after the checkbox into the task `title` while preserving `@tag(value)` tokens and `#hashtags` for
  later extraction.
- `formatTask` always emits canonical Markdown of the form `- [ ] Task` or `- [x] Task` regardless of the input spacing or
  bullet style, keeping stored content consistent.
- Each parsed task receives a deterministic hash-based `id` scoped by the original line text and zero-based line index.

## 4. Supported Metadata & Tags

The parser treats `@tag(value)` pairs generically, but the product currently relies on the following first-class tags. These must
continue to parse into the `tags` record and round-trip through `formatTask`:

| Tag              | Purpose              | Example                             |
| ---------------- | -------------------- | ----------------------------------- |
| `@done(...)`     | Completion timestamp | `- [x] Close loop @done(...)`       |
| `@due(...)`      | Due date             | `- [ ] File taxes @due(2025-04-15)` |
| `@repeat(...)`   | Recurrence cadence   | `- [ ] Weekly review @repeat(1w)`   |
| `@priority(...)` | Priority flag        | `- [ ] Draft brief @priority(A)`    |
| `@estimate(...)` | Effort estimate      | `- [ ] QA pass @estimate(2h)`       |

Additionally, plain `#hashtags` are collected into the `hashtags` array on the `tags` object.

## 5. Known Limitations

1. **Nested subtasks** – Indentation is ignored beyond matching a single task line, so hierarchical relationships are lost.
2. **Escaped characters** – Tag values cannot include `)` or escaped characters, limiting expressive metadata.
3. **Duplicate tags** – Re-using the same tag key overwrites the previous value (except for `hashtags`).

## 6. Goals

- Keep checkbox parsing flexible (accept multiple bullet markers, indentation, and varied whitespace inside `[]`) while
  normalising output via `formatTask`.
- Preserve and expose all recognised tags, ensuring that future features can rely on consistent metadata.
- Provide clear extension points for richer metadata parsing without introducing a heavy Markdown dependency.
- Document and plan for nested subtasks so future work can introduce up to **five** levels of nesting.

## 7. Non-Goals (MVP)

- Introducing a full Markdown AST parser.
- Supporting arbitrary inline formatting (tables, block quotes) inside task titles beyond plain text and metadata tokens.
- Rewriting historical documents to infer nesting automatically.

## 8. Behaviour Details

- **Checkbox detection** – Regex tolerates indentation, bullet variants, and whitespace around the marker. Trimmed `x`/`X`
  indicates a checked task; empty or whitespace-only markers remain unchecked.
- **Tag extraction** – The parser iterates over `@tag(value)` entries, storing the last occurrence per key. `#hashtags` are
  collected after tag removal and exposed as `tags.hashtags` (string array).
- **Formatting** – Before persisting or rendering, call `formatTask` on parsed tasks to normalise checkbox spacing and bullet
  style to `- [ ]` / `- [x]`. This step also appends tags and hashtags in a consistent order.
- **Document parsing** – `parseMarkdown` splits documents by newline, preserving the zero-based `lineIndex` for each task.

## 9. Future Work

- Support up to **five** levels of nested tasks by pairing indentation depth with parent relationships.
- Allow escaped characters in tag values (e.g., `@note(contains \) parenthesis)`), potentially by switching to a tokenizer.
- Represent multi-valued tags without overwriting, likely via arrays or structured metadata objects.

## 15. AI Handoff & Test Tracking

- **Implemented:** Baseline permissive checkbox parsing, canonical formatter, tag and hashtag extraction.
- **Pending:** Nested task hierarchy (depth up to five), escaped tag characters, multi-value tag support.
- **Test coverage targets:**
  - Unit: `apps/web/src/lib/parsing/parseTask.test.ts`
  - Integration: Covered indirectly via preview/editor specs once nesting work begins.
