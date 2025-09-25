// place files you want to import through the `$lib` alias in this folder.

// Only needed for TS to understand SVG imports
declare module "*.svg" {
  const content: string;
  export default content;
}
