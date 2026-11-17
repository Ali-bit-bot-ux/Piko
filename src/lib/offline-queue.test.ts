import { describe, expect, it, vi } from "vitest";
import {
  createOfflineQueue,
  flushQueue,
  type QueueStorage,
  type QueuedItem,
} from "./offline-queue";

function memoryStorage(initial: Record<string, string> = {}): QueueStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const item = (
  id: string,
  payload: unknown = { value: 1 },
): QueuedItem<unknown> => ({
  id,
  payload,
  queuedAt: 1,
});

describe("createOfflineQueue", () => {
  it("keeps items in order and survives a new queue on the same storage", () => {
    const storage = memoryStorage();
    const queue = createOfflineQueue(storage, "k");
    queue.add(item("a"));
    queue.add(item("b"));
    expect(
      createOfflineQueue(storage, "k")
        .list()
        .map((i) => i.id),
    ).toEqual(["a", "b"]);
    expect(queue.size()).toBe(2);
  });

  it("does not add the same id twice", () => {
    const queue = createOfflineQueue(memoryStorage(), "k");
    queue.add(item("a"));
    queue.add(item("a", { value: 2 }));
    expect(queue.size()).toBe(1);
  });

  it("removes an item by id", () => {
    const queue = createOfflineQueue(memoryStorage(), "k");
    queue.add(item("a"));
    queue.add(item("b"));
    queue.remove("a");
    expect(queue.list().map((i) => i.id)).toEqual(["b"]);
  });

  it("keeps separate queues under separate keys", () => {
    const storage = memoryStorage();
    createOfflineQueue(storage, "one").add(item("a"));
    expect(createOfflineQueue(storage, "two").size()).toBe(0);
  });

  it("treats broken or foreign data as an empty queue", () => {
    for (const raw of ["not json", '{"a":1}', "[1,2,3]", '[{"id":5}]']) {
      expect(createOfflineQueue(memoryStorage({ k: raw }), "k").list()).toEqual(
        [],
      );
    }
  });

  it("does not throw when the storage refuses to write", () => {
    const queue = createOfflineQueue(
      {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      },
      "k",
    );
    expect(() => queue.add(item("a"))).not.toThrow();
  });
});

describe("flushQueue", () => {
  const filled = () => {
    const queue = createOfflineQueue(memoryStorage(), "k");
    ["a", "b", "c"].forEach((id) => queue.add(item(id)));
    return queue;
  };

  it("sends everything in order and empties the queue", async () => {
    const queue = filled();
    const order: string[] = [];
    const result = await flushQueue(queue, async (i) => {
      order.push(i.id);
      return "sent";
    });
    expect(order).toEqual(["a", "b", "c"]);
    expect(result).toEqual({
      sent: ["a", "b", "c"],
      dropped: [],
      remaining: 0,
    });
  });

  it("stops at the first retry and keeps the rest in order", async () => {
    const queue = filled();
    const send = vi.fn(async (i: QueuedItem<unknown>) =>
      i.id === "b" ? ("retry" as const) : ("sent" as const),
    );
    const result = await flushQueue(queue, send);
    expect(send).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: ["a"], dropped: [], remaining: 2 });
    expect(queue.list().map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("removes an item the server will never accept and goes on", async () => {
    const queue = filled();
    const result = await flushQueue(queue, async (i) =>
      i.id === "a" ? "drop" : "sent",
    );
    expect(result).toEqual({ sent: ["b", "c"], dropped: ["a"], remaining: 0 });
  });

  it("treats a thrown error (no connection) as retry", async () => {
    const queue = filled();
    const result = await flushQueue(queue, async () => {
      throw new TypeError("fetch failed");
    });
    expect(result).toEqual({ sent: [], dropped: [], remaining: 3 });
  });

  it("does nothing for an empty queue", async () => {
    const send = vi.fn();
    const result = await flushQueue(
      createOfflineQueue(memoryStorage(), "k"),
      send,
    );
    expect(send).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: [], dropped: [], remaining: 0 });
  });
});
