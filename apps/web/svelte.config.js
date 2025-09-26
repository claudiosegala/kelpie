import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const isProd = process.env.NODE_ENV === "production";
const [owner = "", repo = ""] = process.env.GITHUB_REPOSITORY?.split("/") ?? [];
const isUserOrOrgPagesRepo = repo === `${owner}.github.io`;

export default {
  compilerOptions: { runes: true }, // Svelte 5 runes
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    paths: {
      base: isProd && repo && !isUserOrOrgPagesRepo ? `/${repo}` : ""
    },
    prerender: { handleHttpError: "warn" },
    csrf: { trustedOrigins: [] }
  }
};
