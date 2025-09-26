import { serialiseSnapshot, measureSerializedLength } from "./serialization";
import type { StorageSnapshot } from "./types";

export function estimateSnapshotSize(snapshot: StorageSnapshot): number {
  const json = serialiseSnapshot(snapshot);
  return measureSerializedLength(json);
}
