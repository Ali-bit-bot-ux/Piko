import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LocalStorage,
  StorageError,
  createStorage,
  type Storage,
} from "./index";

let dir: string;
let storage: Storage;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "piko-storage-"));
  storage = new LocalStorage(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const bytes = (...values: number[]) => new Uint8Array(values);

describe("LocalStorage", () => {
  it("stores and reads back bytes, including nested keys", async () => {
    await storage.put("videos/intake-1/match.mp4", bytes(1, 2, 3));
    expect(await storage.get("videos/intake-1/match.mp4")).toEqual(
      bytes(1, 2, 3),
    );
  });

  it("overwrites an existing key", async () => {
    await storage.put("a.bin", bytes(1));
    await storage.put("a.bin", bytes(9, 9));
    expect(await storage.get("a.bin")).toEqual(bytes(9, 9));
  });

  it("reports a missing key as not_found", async () => {
    await expect(storage.get("missing.bin")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("deletes a key and tolerates deleting a missing one", async () => {
    await storage.put("a.bin", bytes(1));
    await storage.delete("a.bin");
    await expect(storage.get("a.bin")).rejects.toBeInstanceOf(StorageError);
    await expect(storage.delete("a.bin")).resolves.toBeUndefined();
  });

  it.each([
    "../escape.bin",
    "a/../../escape.bin",
    "/etc/passwd",
    "C:\\Windows\\system.ini",
    "a\\..\\b",
    "a//b",
    "./a.bin",
    "",
    ".hidden",
    "bad key.bin",
  ])("rejects the unsafe key %j", async (key) => {
    await expect(storage.put(key, bytes(1))).rejects.toMatchObject({
      code: "invalid_key",
    });
    await expect(storage.get(key)).rejects.toMatchObject({
      code: "invalid_key",
    });
    await expect(storage.delete(key)).rejects.toMatchObject({
      code: "invalid_key",
    });
  });

  it("does not support signed URLs", async () => {
    await expect(storage.signedUrl("a.bin", 60)).rejects.toMatchObject({
      code: "unsupported",
    });
  });
});

describe("createStorage", () => {
  it("builds local storage", () => {
    const created = createStorage({ storage: "local", storageLocalDir: dir });
    expect(created).toBeInstanceOf(LocalStorage);
  });

  it("fails clearly for cloud storage", () => {
    expect(() =>
      createStorage({ storage: "cloud", storageLocalDir: dir }),
    ).toThrow(/T-061/);
  });
});
