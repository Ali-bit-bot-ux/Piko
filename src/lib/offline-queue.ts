/**
 * A small persistent queue for things that could not be sent because there was
 * no connection (results typed in on the pitch). Items keep their order and
 * their own id, so sending one again after a lost answer changes nothing on
 * the server (the id is the journal event id).
 */

export type QueuedItem<T> = {
  /** Unique id of the item (the client event id). */
  id: string;
  payload: T;
  queuedAt: number;
};

/** The slice of `Storage` the queue needs (localStorage in the browser). */
export type QueueStorage = Pick<Storage, "getItem" | "setItem">;

export type OfflineQueue<T> = {
  list(): QueuedItem<T>[];
  size(): number;
  /** Adds an item; an item with the same id is not added twice. */
  add(item: QueuedItem<T>): void;
  remove(id: string): void;
};

function isItem(value: unknown): value is QueuedItem<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.queuedAt === "number" &&
    "payload" in item
  );
}

/** Queue stored under one key. Broken or missing data reads as an empty queue. */
export function createOfflineQueue<T>(
  storage: QueueStorage,
  key: string,
): OfflineQueue<T> {
  const read = (): QueuedItem<T>[] => {
    try {
      const raw = storage.getItem(key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? (parsed.filter(isItem) as QueuedItem<T>[])
        : [];
    } catch {
      return [];
    }
  };
  const write = (items: QueuedItem<T>[]) => {
    try {
      storage.setItem(key, JSON.stringify(items));
    } catch {
      // Storage full or blocked: nothing more can be done here.
    }
  };

  return {
    list: read,
    size: () => read().length,
    add(item) {
      const items = read();
      if (items.some((existing) => existing.id === item.id)) return;
      write([...items, item]);
    },
    remove(id) {
      write(read().filter((item) => item.id !== id));
    },
  };
}

/**
 * What to do with an item after trying to send it:
 * - "sent": the server has it (also when it already had it), remove it;
 * - "drop": the server will never accept it (bad data, closed intake), remove it and tell the user;
 * - "retry": no answer or a server fault, keep it and try again later.
 */
export type SendOutcome = "sent" | "drop" | "retry";

export type FlushResult = {
  sent: string[];
  dropped: string[];
  remaining: number;
};

/**
 * Sends the queued items one by one, oldest first. It stops at the first
 * "retry" so the order is kept and a dead connection is not hammered.
 */
export async function flushQueue<T>(
  queue: OfflineQueue<T>,
  send: (item: QueuedItem<T>) => Promise<SendOutcome>,
): Promise<FlushResult> {
  const sent: string[] = [];
  const dropped: string[] = [];

  for (const item of queue.list()) {
    let outcome: SendOutcome;
    try {
      outcome = await send(item);
    } catch {
      outcome = "retry";
    }
    if (outcome === "retry") break;
    queue.remove(item.id);
    (outcome === "sent" ? sent : dropped).push(item.id);
  }

  return { sent, dropped, remaining: queue.size() };
}
