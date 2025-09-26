// Ambient module declaration for bundling SVGs via the $lib alias.
declare module "*.svg" {
    const content: string;
    export default content;
}
