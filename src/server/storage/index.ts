import type { AppConfig } from "../config";
import { LocalStorage } from "./local-storage";
import { StorageError, type Storage } from "./types";

export * from "./types";
export { LocalStorage } from "./local-storage";

/** Builds the storage chosen by STORAGE. */
export function createStorage(
  config: Pick<AppConfig, "storage" | "storageLocalDir">,
): Storage {
  switch (config.storage) {
    case "local":
      return new LocalStorage(config.storageLocalDir);
    case "cloud":
      throw new StorageError(
        "unsupported",
        "Cloud storage is not implemented yet (T-061)",
      );
  }
}
