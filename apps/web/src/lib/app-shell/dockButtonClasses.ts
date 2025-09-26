const baseDockButtonClasses =
  "dock-item btn btn-sm sm:btn-md btn-circle border border-transparent bg-base-100/70 text-base-content/80 shadow-none transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const toneFocusClasses = {
  primary: "focus-visible:outline-primary/70",
  secondary: "focus-visible:outline-secondary/70"
} as const;

const activeStateClasses = {
  primary: "bg-primary text-primary-content shadow-lg shadow-primary/30 ring-2 ring-primary/70",
  secondary: "bg-secondary text-secondary-content shadow-lg shadow-secondary/30 ring-2 ring-secondary/70"
} as const;

const inactiveStateClasses = "hover:border-base-300 hover:bg-base-200/70 hover:text-base-content";
const disabledStateClasses = "btn-disabled opacity-40";

export type DockButtonTone = keyof typeof activeStateClasses;

export function getDockButtonClasses({
  tone,
  isActive,
  disabled = false
}: {
  tone: DockButtonTone;
  isActive: boolean;
  disabled?: boolean;
}): string {
  return [
    baseDockButtonClasses,
    toneFocusClasses[tone],
    isActive ? activeStateClasses[tone] : inactiveStateClasses,
    disabled ? disabledStateClasses : ""
  ]
    .filter((value) => value.length > 0)
    .join(" ");
}
