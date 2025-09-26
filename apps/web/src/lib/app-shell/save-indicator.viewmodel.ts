import { SaveStatusKind } from "$lib/app-shell/contracts";
import type { SaveStatus } from "$lib/app-shell/contracts";
import { getTimestampDetails, toneFor, tooltipFor } from "./save-indicator.config";
import type { SaveIndicatorTimestampDetails } from "./save-indicator.config";

const BASE_BADGE_CLASSES = ["indicator"];
const SAVING_BADGE_CLASSES = ["indicator--saving", "animate-pulse"];

export type SaveIndicatorViewModel = {
  kind: SaveStatus["kind"];
  label: string;
  badgeClasses: string;
  iconToneClass: string;
  tooltipMessage: string;
  timestampDetails?: SaveIndicatorTimestampDetails;
  ariaLabel: string;
};

const buildTooltipMessage = (kind: SaveStatus["kind"], timestampDetails?: SaveIndicatorTimestampDetails) => {
  const tooltipBase = tooltipFor(kind);
  return timestampDetails ? `${tooltipBase}\n${timestampDetails.tooltipLine}` : tooltipBase;
};

const buildBadgeClasses = (kind: SaveStatus["kind"], toneClass: string) => {
  const classes = [...BASE_BADGE_CLASSES, toneClass];

  if (kind === SaveStatusKind.Saving) {
    classes.push(...SAVING_BADGE_CLASSES);
  }

  return classes.join(" ");
};

export const buildSaveIndicatorViewModel = (status: SaveStatus): SaveIndicatorViewModel => {
  const tone = toneFor(status.kind);
  const timestampDetails = getTimestampDetails(status);

  const tooltipMessage = buildTooltipMessage(status.kind, timestampDetails);

  return {
    kind: status.kind,
    label: status.message,
    badgeClasses: buildBadgeClasses(status.kind, tone.badge),
    iconToneClass: tone.icon,
    tooltipMessage,
    timestampDetails,
    ariaLabel: `${status.message}. ${tooltipMessage}`
  };
};
