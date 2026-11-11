// Typed wrappers around Tauri commands. The only file that calls `invoke`.
import { invoke } from "@tauri-apps/api/core";

export type Health = {
  appliedMigrations: number;
};

export type ApiErrorKind = "databaseUnavailable" | "database" | "unknown";

export type ApiError = {
  kind: ApiErrorKind;
  message: string;
};

/** Normalises any rejection into an ApiError. Idempotent. */
export function toApiError(error: unknown): ApiError {
  if (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const kind =
      error.kind === "databaseUnavailable" || error.kind === "database"
        ? error.kind
        : "unknown";
    return { kind, message: error.message };
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
