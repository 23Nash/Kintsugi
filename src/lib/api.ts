// Typed wrappers around Tauri commands. The only file that calls `invoke`.
import { invoke } from "@tauri-apps/api/core";

export type Health = {
  appliedMigrations: number;
};

/**
 * Drift guard: mirrors `ErrorKind` in `src-tauri/src/error.rs`. The Rust test
 * `serialises_the_exact_kind_list` and the test in `api.test.ts` assert the
 * same list; change all four together.
 */
export const API_ERROR_KINDS = [
  "databaseUnavailable",
  "database",
  "validation",
  "notFound",
  "network",
  "rateLimited",
  "upstream",
  "cancelled",
  "internal",
] as const;

export type ApiErrorKind = (typeof API_ERROR_KINDS)[number] | "unknown";

export type ApiError = {
  kind: ApiErrorKind;
  message: string;
  field?: string;
};

function isListedKind(kind: unknown): kind is (typeof API_ERROR_KINDS)[number] {
  return API_ERROR_KINDS.some((listed) => listed === kind);
}

/** Normalises any rejection into an ApiError. Idempotent. */
export function toApiError(error: unknown): ApiError {
  if (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const kind = isListedKind(error.kind) ? error.kind : "unknown";
    const result: ApiError = { kind, message: error.message };
    if ("field" in error && typeof error.field === "string") {
      result.field = error.field;
    }
    return result;
  }
  return { kind: "unknown", message: String(error) };
}

async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw toApiError(error);
  }
}

/** Database health: number of applied migrations. Rejects with an ApiError. */
export function health(): Promise<Health> {
  return call<Health>("health");
}
