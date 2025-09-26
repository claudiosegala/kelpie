import type { StorageSnapshot } from "./types";

function encodeLength(value: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }
  return value.length;
}

export function estimateSnapshotSize(snapshot: StorageSnapshot): number {
  const json = JSON.stringify(snapshot);
  return encodeLength(json);
}
