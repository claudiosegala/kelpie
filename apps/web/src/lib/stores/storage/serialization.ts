import type { StorageSnapshot } from "./types";

type CanonicalValue = null | string | number | boolean | CanonicalValue[] | { [key: string]: CanonicalValue };

function toCanonical(value: unknown): CanonicalValue {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toCanonical(item));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));

    const canonical: Record<string, CanonicalValue> = {};
    for (const [key, item] of entries) {
      if (item === undefined) {
        continue;
      }
      canonical[key] = toCanonical(item);
    }
    return canonical;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return null;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  const stringified = JSON.stringify(value);
  if (typeof stringified === "undefined") {
    return null;
  }

  return JSON.parse(stringified) as CanonicalValue;
}

export function serialiseSnapshot(snapshot: StorageSnapshot): string {
  const canonical = toCanonical(snapshot);
  return JSON.stringify(canonical);
}

export function measureSerializedLength(value: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }

  return value.length;
}
