/**
 * ThemePicker 的存储与编解码工具
 * 由 theme-logic.js 的「1. IndexedDB 工具函数」与「2. 辅助工具函数」抽出。
 */

// === 1. IndexedDB 工具函数 (保持原逻辑) ===
const DB_NAME = 'MyNavDB';
const STORE_NAME = 'settings';
let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

export async function saveImage(blob) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, 'bg-image');
  } catch (e) { console.error('Save image failed', e); }
}

export async function getImage() {
  try {
    const db = await getDB();
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('bg-image');
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
}

export async function removeImage() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('bg-image');
  } catch (e) { console.error('Remove image failed', e); }
}

// === 2. 辅助工具函数 ===
export const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

export const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

export const base64ToBlob = async (base64) => (await fetch(base64)).blob();
