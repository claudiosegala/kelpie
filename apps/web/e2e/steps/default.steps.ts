import { createBdd } from "playwright-bdd";
import fs from "node:fs";
import path from "node:path";

const { Given, Then } = createBdd();

const STORAGE_KEY = "kelpie.todo.mmd:v1";

Given("I open the app with {string}", async ({ page }, fixture: string) => {
  const filePath = path.resolve("src/lib/fixtures", fixture);
  const md = fs.readFileSync(filePath, "utf8");
  await page.goto("/");
  await page.evaluate(
    ([key, content]) =>
      localStorage.setItem(
        key || "", // TODO: remove this null treatment
        JSON.stringify({
          file: content,
          ui: { panes: {}, activeFilters: {} },
          meta: { version: 1 }
        })
      ),
    [STORAGE_KEY, md]
  );
  await page.reload();
});


Then("the Markdown contains {string}", async ({ page }, needle: string) => {
  const md: string | null = await page.evaluate((key: string) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { file: string }).file : null;
  }, STORAGE_KEY);

  expect(md).not.toBeNull();
  expect(md!).toContain(needle);
});
