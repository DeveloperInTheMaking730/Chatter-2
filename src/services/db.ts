import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Message } from '../types';

interface ChatterDB extends DBSchema {
  messages: {
    key: string;
    value: Message;
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<ChatterDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChatterDB>('chatter-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

// 👈 This is the crucial fix right here!
export async function saveMessage(message: Message): Promise<void> {
  // If the message or the current chat state is ephemeral, DO NOT save it to the database!
  if (message.isEphemeral || sessionStorage.getItem('ephemeral_mode') === 'true') {
    console.log('Ephemeral mode active: Keeping message in temporary memory only.');
    return;
  }

  const db = await getDB();
  await db.put('messages', message);
}

export async function getMessages(): Promise<Message[]> {
  const db = await getDB();
  return db.getAllFromIndex('messages', 'by-timestamp');
}

export async function clearMessages(): Promise<void> {
  const db = await getDB();
  await db.clear('messages');
}
