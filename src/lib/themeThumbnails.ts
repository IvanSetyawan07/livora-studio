// @/lib/themeThumbnails.ts

const DB_NAME = "livora-thumbnails";
const STORE = "thumbnails";
const EVENT = "livora:themeThumbnails:changed";

export type ThemeThumbnail = {
  image: string;
  updatedAt: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllThumbnails(): Promise<Record<string, ThemeThumbnail>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const result: Record<string, ThemeThumbnail> = {};
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        result[cursor.key as string] = cursor.value;
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });
}

export async function getThumbnail(key: string): Promise<ThemeThumbnail | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveThumbnail(key: string, thumb: ThemeThumbnail): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(thumb, key);
    req.onsuccess = () => {
      window.dispatchEvent(new Event(EVENT));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteThumbnail(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
    req.onsuccess = () => {
      window.dispatchEvent(new Event(EVENT));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export function subscribeThumbnails(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}