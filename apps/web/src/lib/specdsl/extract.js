// 📂 Node core modules for file & path handling
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 🗺️ Workaround to simulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);  // current file path
const __dirname = path.dirname(__filename);        // current folder path

// 📍 Where the input specs live (Markdown files with embedded Gherkin blocks)
const SPEC_DIR = path.resolve(__dirname, "../../../../../specs");

// 📍 Where we want to output the .feature files (for Playwright BDD)
const OUT_DIR = path.resolve("../../apps/web/e2e/features");

// 🏗️ Ensure output directory exists (create recursively if missing)
fs.mkdirSync(OUT_DIR, { recursive: true });

// 📑 Get all Markdown files in the specs directory
const files = fs.readdirSync(SPEC_DIR).filter(f => f.endsWith(".md"));

// 🔁 For each spec file…
for (const file of files) {
    // 📖 Read the full Markdown content
    const full = fs.readFileSync(path.join(SPEC_DIR, file), "utf8");

    // 🔎 Regex to capture Gherkin code blocks (```gherkin ... ```)
    const regex = /```gherkin(?<body>[\s\S]*?)```/g;

    // 🧩 Extract all matches (using regex groups), clean them up
    const blocks = [...full.matchAll(regex)]
        .flatMap((m) => (m.groups?.body ? [m.groups.body.trim()] : []));

    // 📝 For each Gherkin block found…
    blocks.forEach((content, i) => {
        // 🏷️ Generate output file name: same as source.md + index
        const out = path.join(
            OUT_DIR,
            `${path.basename(file, ".md")}.${i + 1}.feature`
        );

        // 💾 Write the Gherkin block into a .feature file
        fs.writeFileSync(out, content);

        // 📢 Log what we wrote for feedback
        console.log("✅ wrote", out);
    });
}
