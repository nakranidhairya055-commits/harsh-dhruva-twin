/**
 * DhruvaTwin offline outbox.
 *
 * Field traffic is written to an IndexedDB priority queue before any network
 * attempt. The station link is intermittent and can be lost for the whole
 * duration of a katabatic blackout, so nothing is ever dropped: items are
 * ordered by priority and replayed when the uplink returns.
 *
 * Priority classes:
 *   1 SOS      - distress, always first, never expires
 *   2 CRITICAL - incident escalation, equipment protection
 *   3 CHECKIN  - field party safety check-in
 *   4 ROUTINE  - telemetry batches, notes, logs
 */

export const PRIORITY = {
  SOS: 1,
  CRITICAL: 2,
  CHECKIN: 3,
  ROUTINE: 4,
} as const;

export type QueuePriority = (typeof PRIORITY)[keyof typeof PRIORITY];

export const PRIORITY_LABELS: Record<number, string> = {
  1: "SOS",
  2: "Critical",
  3: "Check-in",
  4: "Routine",
};

export interface QueueItem {
  id?: number;
  priority: QueuePriority;
  kind: string;
  label: string;
  topic: string;
  payload: string;
  createdAt: number;
  attempts: number;
  deliveredAt?: number;
}

const DB_NAME = "dhruvatwin-offline";
const DB_VERSION = 1;
const STORE = "outbox";

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error("IndexedDB unavailable in this runtime"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("by_priority", "priority");
        store.createIndex("by_created", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

/** Highest priority first, then oldest first inside a priority class. */
function orderItems(items: QueueItem[]): QueueItem[] {
  return items.sort((a, b) =>
    a.priority === b.priority ? a.createdAt - b.createdAt : a.priority - b.priority,
  );
}

/** Write one item to the outbox. */
export async function enqueue(
  item: Omit<QueueItem, "id" | "createdAt" | "attempts">,
): Promise<number | null> {
  if (!hasIndexedDb()) return null;
  try {
    const id = await tx<IDBValidKey>("readwrite", (store) =>
      store.add({ ...item, createdAt: Date.now(), attempts: 0 }),
    );
    return typeof id === "number" ? id : null;
  } catch {
    return null;
  }
}

/** Pending items in replay order. */
export async function listPending(): Promise<QueueItem[]> {
  if (!hasIndexedDb()) return [];
  try {
    const rows = await tx<QueueItem[]>("readonly", (store) => store.getAll());
    return orderItems(rows ?? []);
  } catch {
    return [];
  }
}

/** Item counts per priority class. */
export async function queueStats(): Promise<{
  total: number;
  byPriority: Record<number, number>;
  oldestAt: number | null;
}> {
  const rows = await listPending();
  const byPriority: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of rows) {
    byPriority[row.priority] = (byPriority[row.priority] ?? 0) + 1;
  }
  return {
    total: rows.length,
    byPriority,
    oldestAt: rows.length ? Math.min(...rows.map((r) => r.createdAt)) : null,
  };
}

/** Remove a delivered item from the outbox. */
export async function removeItem(id: number): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    await tx("readwrite", (store) => store.delete(id));
  } catch {
    /* nothing to remove */
  }
}

/** Record a failed delivery attempt so backoff can be shown to operators. */
export async function bumpAttempt(item: QueueItem): Promise<void> {
  if (!hasIndexedDb() || item.id === undefined) return;
  try {
    await tx("readwrite", (store) =>
      store.put({ ...item, attempts: item.attempts + 1 }),
    );
  } catch {
    /* attempt counter is advisory only */
  }
}

/** Empty the outbox (used when an operator clears a stuck queue). */
export async function clearQueue(): Promise<number> {
  const rows = await listPending();
  for (const row of rows) {
    if (row.id !== undefined) await removeItem(row.id);
  }
  return rows.length;
}
