export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SocietyCartDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('cart_files')) {
        db.createObjectStore('cart_files');
      }
    };
  });
};

export const saveCartFile = async (cartId: string, file: File): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cart_files', 'readwrite');
    const store = tx.objectStore('cart_files');
    const request = store.put(file, cartId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCartFile = async (cartId: string): Promise<File | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cart_files', 'readonly');
    const store = tx.objectStore('cart_files');
    const request = store.get(cartId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const removeCartFile = async (cartId: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cart_files', 'readwrite');
    const store = tx.objectStore('cart_files');
    const request = store.delete(cartId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearAllCartFiles = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cart_files', 'readwrite');
    const store = tx.objectStore('cart_files');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
