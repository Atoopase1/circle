// ============================================================
// IndexedDB Message Cache — Persists messages across sessions
// ============================================================
'use client';

const DB_NAME = 'tekyel-msg-cache';
const DB_VERSION = 1;
const STORE_NAME = 'messages';
const CHATS_STORE = 'chats';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME); // key = chatId
      }
      if (!db.objectStoreNames.contains(CHATS_STORE)) {
        db.createObjectStore(CHATS_STORE); // key = 'chatList'
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Save messages for a specific chat to IndexedDB */
export async function cacheMessages(chatId: string, messages: any[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    // Only cache the last 50 messages to keep the cache lean
    const toCache = messages.slice(-50);
    tx.objectStore(STORE_NAME).put(toCache, chatId);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[Cache] Failed to cache messages:', e);
  }
}

/** Load cached messages for a specific chat from IndexedDB */
export async function getCachedMessages(chatId: string): Promise<any[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(chatId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('[Cache] Failed to read cached messages:', e);
    return null;
  }
}

/** Save the chat list to IndexedDB */
export async function cacheChatList(chats: any[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(CHATS_STORE, 'readwrite');
    tx.objectStore(CHATS_STORE).put(chats, 'chatList');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[Cache] Failed to cache chat list:', e);
  }
}

/** Load cached chat list from IndexedDB */
export async function getCachedChatList(): Promise<any[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(CHATS_STORE, 'readonly');
    const request = tx.objectStore(CHATS_STORE).get('chatList');
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('[Cache] Failed to read cached chat list:', e);
    return null;
  }
}
