import { SaveStatusKind } from "$lib/app-shell/contracts";
import type { SaveStatus } from "$lib/app-shell/contracts";

type ToneClasses = { badge: string; icon: string };

type SaveIndicatorView = {
  tone: ToneClasses;
  tooltip: string;
};

export type SaveIndicatorTimestampDetails = {
  display: string;
  tooltipLine: string;
};

export const LOCAL_SAVE_TOOLTIP =
  "Changes are stored locally on this device for now. Cloud sync will be introduced in a future release.";
export const ERROR_TOOLTIP =
  "We couldn't save locally. Retry or export your data to keep a copy while we work on cloud sync.";

export const DEFAULT_KIND = SaveStatusKind.Saved;

export const SAVE_INDICATOR_CONFIG: Record<SaveStatus["kind"], SaveIndicatorView> = {
  [SaveStatusKind.Idle]: {
    tone: {
      badge: "border-success/40 bg-success/10 text-success",
      icon: "text-success"
    },
    tooltip: LOCAL_SAVE_TOOLTIP
  },
  [SaveStatusKind.Saving]: {
    tone: {
      badge: "border-info/40 bg-info/10 text-info",
      icon: "text-info"
    },
    tooltip: LOCAL_SAVE_TOOLTIP
  },
  [SaveStatusKind.Saved]: {
    tone: {
      badge: "border-success/40 bg-success/10 text-success",
      icon: "text-success"
    },
    tooltip: LOCAL_SAVE_TOOLTIP
  },
  [SaveStatusKind.Error]: {
    tone: {
      badge: "border-error/40 bg-error/10 text-error",
      icon: "text-error"
    },
    tooltip: ERROR_TOOLTIP
  }
};

const getConfigFor = (kind: SaveStatus["kind"]) => SAVE_INDICATOR_CONFIG[kind] ?? SAVE_INDICATOR_CONFIG[DEFAULT_KIND];

export const toneFor = (kind: SaveStatus["kind"]) => getConfigFor(kind).tone;
export const tooltipFor = (kind: SaveStatus["kind"]) => getConfigFor(kind).tooltip;

export const getTimestampDetails = (status: SaveStatus): SaveIndicatorTimestampDetails | undefined => {
  if (status.kind !== SaveStatusKind.Saved || !status.timestamp) {
    return undefined;
  }

  const formattedTime = new Date(status.timestamp).toLocaleTimeString();

  return {
    display: `(${formattedTime})`,
    tooltipLine: `Last saved at ${formattedTime}.`
  };
};
