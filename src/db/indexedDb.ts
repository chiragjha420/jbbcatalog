// Lightweight, promise-based IndexedDB engine for iOS Safari PWA and Web

const DB_NAME = 'jbb_gallery_web';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getWebDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Categories
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }

      // 2. Products
      if (!db.objectStoreNames.contains('products')) {
        const prodStore = db.createObjectStore('products', { keyPath: 'id' });
        prodStore.createIndex('idx_favorite', 'is_favorite', { unique: false });
        prodStore.createIndex('idx_category', 'category_id', { unique: false });
        prodStore.createIndex('idx_updated', 'updated_at', { unique: false });
        prodStore.createIndex('idx_recent', 'recently_viewed_at', { unique: false });
      }

      // 3. Images
      if (!db.objectStoreNames.contains('images')) {
        const imgStore = db.createObjectStore('images', { keyPath: 'id' });
        imgStore.createIndex('idx_product_id', 'product_id', { unique: false });
        imgStore.createIndex('idx_sort_order', 'sort_order', { unique: false });
      }

      // 4. Blobs / Image Data
      if (!db.objectStoreNames.contains('blobs')) {
        db.createObjectStore('blobs', { keyPath: 'id' });
      }

      // 5. Settings (Theme preference, etc.)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getWebDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getWebDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await getWebDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await getWebDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbClear(storeName: string): Promise<void> {
  const db = await getWebDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
