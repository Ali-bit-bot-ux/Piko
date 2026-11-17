import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { StorageError, type Storage } from "./types";

// Letters, digits, dot, dash, underscore, slash. Must start with a letter or digit.
const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/;

/**
 * Storage on the local disk, for development. Keys are validated so a key
 * can never point outside the root directory.
 */
export class LocalStorage implements Storage {
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = path.resolve(rootDir);
  }

  private resolveKey(key: string): string {
    const segments = key.split("/");
    const unsafe =
      !KEY_PATTERN.test(key) ||
      segments.some((s) => s === "" || s === "." || s === "..");
    if (unsafe) {
      throw new StorageError("invalid_key", `Invalid storage key: ${key}`);
    }
    const target = path.resolve(this.root, ...segments);
    const relative = path.relative(this.root, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new StorageError("invalid_key", `Invalid storage key: ${key}`);
    }
    return target;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const target = this.resolveKey(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  async get(key: string): Promise<Uint8Array> {
    const target = this.resolveKey(key);
    try {
      return new Uint8Array(await readFile(target));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new StorageError("not_found", `Not found: ${key}`);
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async signedUrl(key: string): Promise<string> {
    this.resolveKey(key);
    throw new StorageError(
      "unsupported",
      "Signed URLs are not supported by local storage",
    );
  }
}
