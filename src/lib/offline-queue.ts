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
  /** How many times the server answered with a fault (not a lost connection). */
  failures?: number;
};

/** After this many server faults an item is given up, so it cannot block the rest. */
export const MAX_SERVER_FAULTS = 5;

/** The slice of `Storage` the queue needs (localStorage in the browser). */
export type QueueStorage = Pick<Storage, "getItem" | "setItem">;

export type OfflineQueue<T> = {
  list(): QueuedItem<T>[];
  size(): number;
  /**
   * Adds an item; an item with the same id is not added twice. False when it
   * could not be stored (storage full or blocked): the caller must tell the user.
   */
  add(item: QueuedItem<T>): boolean;
  remove(id: string): void;
  /** Counts one server fault for the item and returns the new count. */
  recordFault(id: string): number;
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
  const write = (items: QueuedItem<T>[]): boolean => {
    try {
      storage.setItem(key, JSON.stringify(items));
      return true;
    } catch {
      // Storage full or blocked: the caller decides what to tell the user.
      return false;
    }
  };

  return {
    list: read,
    size: () => read().length,
    add(item) {
      const items = read();
      if (items.some((existing) => existing.id === item.id)) return true;
      return write([...items, item]);
    },
    remove(id) {
      write(read().filter((item) => item.id !== id));
    },
    recordFault(id) {
      let count = 0;
      write(
        read().map((item) => {
          if (item.id !== id) return item;
          count = (item.failures ?? 0) + 1;
          return { ...item, failures: count };
        }),
      );
      return count;
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
 * Sends the queued items one by one, oldest first. When there is no
 * connection (the send throws) it stops, so a dead connection is not hammered.
 * When the server answers with a fault the item stays and the next one is
 * tried; after MAX_SERVER_FAULTS faults the item is dropped, so one bad item
 * cannot block everything behind it.
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
      break;
    }
    if (outcome === "retry") {
      if (queue.recordFault(item.id) < MAX_SERVER_FAULTS) continue;
      outcome = "drop";
    }
    queue.remove(item.id);
    (outcome === "sent" ? sent : dropped).push(item.id);
  }

  return { sent, dropped, remaining: queue.size() };
}
