import { EncryptedPayload } from '../types';

/**
 * High-performance End-to-End Encryption using standard Web Crypto API.
 * Uses AES-256-GCM with 12-byte cryptographically secure random IVs,
 * and PBKDF2 (100,000 iterations) with SHA-256.
 */

// In-memory key caches to avoid running 100k PBKDF2 rounds on every message
const directKeyCache = new Map<string, CryptoKey>();
const groupKeyCache = new Map<string, CryptoKey>();

export function clearKeyCache(): void {
  directKeyCache.clear();
  groupKeyCache.clear();
}

// Generate a random 10-digit numeric string
export function generate10DigitCode(): string {
  const array = new Uint32Array(2);
  window.crypto.getRandomValues(array);
  const combined = (BigInt(array[0]) << 32n) | BigInt(array[1]);
  const num = (combined % 9000000000n) + 1000000000n;
  return num.toString();
}

// Convert ArrayBuffer to Base64 in safe chunks (prevent call stack overflow on large media)
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return window.btoa(binary);
}

// Convert Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive a shared deterministic AES-256-GCM key between two 10-digit codes
export async function deriveDirectChatKey(codeA: string, codeB: string): Promise<CryptoKey> {
  const sortedCodes = [codeA, codeB].sort();
  const cacheKey = sortedCodes.join('::cipherzero::');
  if (directKeyCache.has(cacheKey)) {
    return directKeyCache.get(cacheKey)!;
  }

  // Sort lexicographically so both parties compute the exact same key without server involvement
  const combined = sortedCodes.join('::cipherzero-e2ee::');
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(combined),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = enc.encode('cipherzero-salt-' + sortedCodes.join('-'));

  const derived = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  directKeyCache.set(cacheKey, derived);
  return derived;
}

// Derive key for a group chat
export async function deriveGroupKey(groupId: string, secretSeed: string): Promise<CryptoKey> {
  const cacheKey = `${groupId}::${secretSeed}`;
  if (groupKeyCache.has(cacheKey)) {
    return groupKeyCache.get(cacheKey)!;
  }

  const enc = new TextEncoder();
  const raw = `${groupId}::group-e2ee::${secretSeed}`;
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(raw),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = enc.encode(`group-salt-${groupId}`);

  const derived = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  groupKeyCache.set(cacheKey, derived);
  return derived;
}

// Encrypt plaintext string with AES-256-GCM
export async function encryptText(plainText: string, key: CryptoKey): Promise<EncryptedPayload> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    enc.encode(plainText)
  );

  return {
    iv: bufferToBase64(iv.buffer),
    cipherText: bufferToBase64(cipherBuffer),
  };
}

// Decrypt AES-256-GCM payload to plaintext string
export async function decryptText(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  if (!payload || !payload.iv || !payload.cipherText) {
    throw new Error('Malformed encrypted payload');
  }

  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const cipherBytes = base64ToBuffer(payload.cipherText);

  const plainBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    cipherBytes
  );

  const dec = new TextDecoder();
  return dec.decode(plainBuffer);
}

// Encrypt binary data (Images, Audio, Files)
export async function encryptBinary(dataBuffer: ArrayBuffer, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    dataBuffer
  );

  return {
    iv: bufferToBase64(iv.buffer),
    cipherText: bufferToBase64(cipherBuffer),
  };
}

// Decrypt binary data
export async function decryptBinary(payload: EncryptedPayload, key: CryptoKey): Promise<ArrayBuffer> {
  if (!payload || !payload.iv || !payload.cipherText) {
    throw new Error('Malformed encrypted binary payload');
  }

  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const cipherBytes = base64ToBuffer(payload.cipherText);

  return await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    cipherBytes
  );
}

// Generate human-verifiable 60-digit security safety fingerprint (like Signal/WhatsApp)
export async function calculateSafetyNumber(codeA: string, codeB: string): Promise<string[]> {
  const sorted = [codeA, codeB].sort().join(':E2EE-SAFETY-VERIFICATION:');
  const enc = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest('SHA-512', enc.encode(sorted));
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert to 12 blocks of 5 digits
  const blocks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const chunk = (hashArray[i * 4] << 24) | (hashArray[i * 4 + 1] << 16) | (hashArray[i * 4 + 2] << 8) | hashArray[i * 4 + 3];
    const fiveDigits = (Math.abs(chunk) % 100000).toString().padStart(5, '0');
    blocks.push(fiveDigits);
  }
  return blocks;
}

// Export encrypted backup vault file
export async function exportEncryptedVault(data: any, masterPassphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const vaultKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 200000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const plainJson = JSON.stringify({
    version: 1,
    app: 'CipherZero',
    createdAt: Date.now(),
    data,
  });

  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    vaultKey,
    enc.encode(plainJson)
  );

  const vaultEnvelope = {
    cipherZeroVault: true,
    version: 1,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    cipherText: bufferToBase64(cipherBuffer),
    timestamp: Date.now(),
  };

  return JSON.stringify(vaultEnvelope, null, 2);
}

// Decrypt imported backup vault file
export async function importEncryptedVault(vaultJsonString: string, masterPassphrase: string): Promise<any> {
  const envelope = JSON.parse(vaultJsonString);
  if (!envelope.cipherZeroVault || !envelope.salt || !envelope.iv || !envelope.cipherText) {
    throw new Error('Invalid CipherZero backup file format');
  }

  const enc = new TextEncoder();
  const salt = new Uint8Array(base64ToBuffer(envelope.salt));
  const iv = new Uint8Array(base64ToBuffer(envelope.iv));
  const cipherBytes = base64ToBuffer(envelope.cipherText);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const vaultKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 200000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    vaultKey,
    cipherBytes
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuffer);
  const parsed = JSON.parse(jsonStr);
  return parsed.data;
}
