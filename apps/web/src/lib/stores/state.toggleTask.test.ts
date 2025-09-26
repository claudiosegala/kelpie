import { beforeEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";

import { appState, setDocumentContent, tasks, toggleTask } from "./state";

const DOC = `# Heading
- [ ] Alpha
some note
- [x] Beta #tag`;

describe("toggleTask", () => {
  beforeEach(() => {
    setDocumentContent(DOC);
  });

  it("updates the matching line without disturbing surrounding content", () => {
    const parsed = get(tasks);
    const beta = parsed.find((task) => task.title === "Beta");
    expect(beta).toBeDefined();

    toggleTask(beta!.id);

    const updatedFile = get(appState).file.split("\n");
    expect(updatedFile).toEqual(["# Heading", "- [ ] Alpha", "some note", "- [ ] Beta #tag"]);
  });
});
