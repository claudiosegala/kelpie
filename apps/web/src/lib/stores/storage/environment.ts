/**
 * Host environment utilities used by the storage layer.
 *
 * Centralising these checks makes it easier to stub globals in tests
 * and swap implementations when new platforms are supported.
 */
import { storageWarn } from "./logging";

type ImportMetaWithEnv = ImportMeta & {
  env?: Record<string, string | undefined>;
};

function readImportMetaEnv(): Record<string, string | undefined> | undefined {
  try {
    return (import.meta as ImportMetaWithEnv | undefined)?.env;
  } catch {
    return undefined;
  }
}

function readProcessEnv(): Record<string, string | undefined> | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }

  return process.env as Record<string, string | undefined> | undefined;
}

function readEnvValue(key: string): string | undefined {
  const metaEnv = readImportMetaEnv();
  if (metaEnv && typeof metaEnv[key] === "string") {
    return metaEnv[key];
  }

  const processEnv = readProcessEnv();
  if (processEnv && typeof processEnv[key] === "string") {
    return processEnv[key];
  }

  return undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalised = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalised)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalised)) {
    return false;
  }
  return undefined;
}

export function getRuntimeMode(): string | undefined {
  return readEnvValue("MODE") ?? readEnvValue("NODE_ENV");
}

export function isDebugMode(): boolean {
  const mode = getRuntimeMode();
  if (!mode) {
    return true;
  }
  return mode !== "production" && mode !== "test";
}

export function isStorageInstrumentationEnabled(): boolean {
  const globalFlag =
    typeof globalThis !== "undefined" &&
    typeof (globalThis as { __KELPIE_STORAGE_INSTRUMENTATION__?: unknown }).__KELPIE_STORAGE_INSTRUMENTATION__ ===
      "boolean"
      ? Boolean((globalThis as { __KELPIE_STORAGE_INSTRUMENTATION__?: boolean }).__KELPIE_STORAGE_INSTRUMENTATION__)
      : undefined;

  if (typeof globalFlag === "boolean") {
    return globalFlag;
  }

  const envFlag =
    parseBoolean(readEnvValue("VITE_STORAGE_INSTRUMENTATION")) ??
    parseBoolean(readEnvValue("KELPIE_STORAGE_INSTRUMENTATION"));

  return envFlag ?? false;
}

export function getWindow(): (Window & typeof globalThis) | null {
  if (typeof window === "undefined") {
    storageWarn("window is not available");
    return null;
  }

  return window;
}

export function getLocalStorage(): Storage | null {
  if (typeof localStorage === "undefined") {
    storageWarn("localStorage is not available");
    return null;
  }

  return localStorage;
}
