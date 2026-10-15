import { Message, Contact, GroupChat, UserSession, ChatMode } from '../types';

const DB_NAME = 'CipherZero_LocalDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('chatId', 'chatId', { unique: false });
        msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        msgStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('contacts')) {
        db.createObjectStore('contacts', { keyPath: 'friendCode' });
      }

      if (!db.objectStoreNames.contains('groups')) {
        db.createObjectStore('groups', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('pendingQueue')) {
        db.createObjectStore('pendingQueue', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Save message respecting the chat mode
export async function saveMessageLocally(message: Message, mode: ChatMode): Promise<void> {
  if (mode === 'anonymous') {
    // In anonymous mode, ZERO local disk storage.
    return;
  }

  try {
    const db = await initDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    store.put(message);
  } catch (err) {
    console.error('Failed to save message to local DB:', err);
  }
}

// Load messages for a chat
export async function loadMessagesLocally(chatId: string, mode: ChatMode): Promise<Message[]> {
  if (mode === 'anonymous') {
    return [];
  }

  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('chatId');
      const request = index.getAll(chatId);

      request.onsuccess = () => {
        const now = Date.now();
        // Filter out expired ephemeral messages
        const valid = (request.result as Message[]).filter(
          (m) => !m.expiresAt || m.expiresAt > now
        );
        // Sort chronologically
        valid.sort((a, b) => a.timestamp - b.timestamp);
        resolve(valid);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

// Save contact
export async function saveContactLocally(contact: Contact, mode: ChatMode): Promise<void> {
  if (mode === 'anonymous') return;

  try {
    const db = await initDB();
    const tx = db.transaction('contacts', 'readwrite');
    tx.objectStore('contacts').put(contact);
  } catch (err) {
    console.error('Failed to save contact:', err);
  }
}

// Load contacts
export async function loadContactsLocally(mode: ChatMode): Promise<Contact[]> {
  if (mode === 'anonymous') return [];

  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('contacts', 'readonly');
      const request = tx.objectStore('contacts').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Save group
export async function saveGroupLocally(group: GroupChat, mode: ChatMode): Promise<void> {
  if (mode === 'anonymous') return;

  try {
    const db = await initDB();
    const tx = db.transaction('groups', 'readwrite');
    tx.objectStore('groups').put(group);
  } catch (err) {
    console.error('Failed to save group:', err);
  }
}

// Load groups
export async function loadGroupsLocally(mode: ChatMode): Promise<GroupChat[]> {
  if (mode === 'anonymous') return [];

  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('groups', 'readonly');
      const request = tx.objectStore('groups').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Purge expired ephemeral messages from IndexedDB
export async function purgeExpiredEphemeral(): Promise<number> {
  try {
    const db = await initDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    const now = Date.now();

    return new Promise((resolve) => {
      const request = store.openCursor();
      let purgedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const msg = cursor.value as Message;
          if (msg.expiresAt && msg.expiresAt <= now) {
            cursor.delete();
            purgedCount++;
          }
          cursor.continue();
        } else {
          resolve(purgedCount);
        }
      };

      request.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

// Panic Wipe: Immediately purge everything from storage, memory, and cookies!
export async function wipeAllLocalData(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  // Delete IndexedDB
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });

  // Clear SessionStorage and LocalStorage
  sessionStorage.clear();
  localStorage.clear();
}
