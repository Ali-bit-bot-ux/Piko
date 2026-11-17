export interface Storage {
  put(key: string, data: Uint8Array): Promise<void>;
  /** Throws StorageError with code "not_found" when the key does not exist. */
  get(key: string): Promise<Uint8Array>;
  /** Idempotent: deleting a missing key is not an error (needed by D-020). */
  delete(key: string): Promise<void>;
  /** Time-limited download URL. Not every backend supports it. */
  signedUrl(key: string, ttlSec: number): Promise<string>;
}

export type StorageErrorCode = "invalid_key" | "not_found" | "unsupported";

export class StorageError extends Error {
  constructor(
    readonly code: StorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StorageError";
  }
}
