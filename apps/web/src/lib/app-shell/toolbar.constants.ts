export const BRAND_NAME = "Kelpie";
export const BRAND_TAGLINE = "Markdown to-do studio — edit, preview, and fine-tune your flow.";

export function buildBrandTooltip(version: string): string {
  const versionLabel = version.trim() || "Unknown";
  return `${BRAND_NAME} ${versionLabel}\n${BRAND_TAGLINE}`;
}
