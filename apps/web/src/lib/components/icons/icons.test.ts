import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

import EditorIcon from "./EditorIcon.svelte";
import PreviewIcon from "./PreviewIcon.svelte";
import SettingsIcon from "./SettingsIcon.svelte";
import SplitViewIcon from "./SplitViewIcon.svelte";

type IconCase = {
  name: string;
  component: typeof EditorIcon;
  defaultClassName: string;
};

const ICON_CASES: IconCase[] = [
  { name: "EditorIcon", component: EditorIcon, defaultClassName: "h-4 w-4" },
  { name: "PreviewIcon", component: PreviewIcon, defaultClassName: "h-4 w-4" },
  { name: "SettingsIcon", component: SettingsIcon, defaultClassName: "h-4 w-4" },
  { name: "SplitViewIcon", component: SplitViewIcon, defaultClassName: "h-5 w-5" }
];

describe("icons", () => {
  for (const { name, component, defaultClassName } of ICON_CASES) {
    it(`${name} forwards its className prop to the root svg element`, () => {
      const { container: defaultContainer } = render(component);
      const svg = defaultContainer.querySelector("svg");

      expect(svg).toBeInstanceOf(SVGElement);
      expect(svg).toHaveAttribute("class", defaultClassName);

      const customClassName = "h-10 w-10 text-primary";
      const { container: customContainer } = render(component, {
        props: { className: customClassName }
      });

      const customSvg = customContainer.querySelector("svg");
      expect(customSvg).toBeInstanceOf(SVGElement);
      expect(customSvg).toHaveAttribute("class", customClassName);
    });
  }
});
