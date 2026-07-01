import { SCHEMA_VERSION, PIN_LENGTH } from './constants.js';

export const BACKUP_FORMAT = 'investment-portfolio-backup';
export const BACKUP_VERSION = 1;
export const PBKDF2_ITERATIONS = 100000;

function bytesToBase64(bytes) {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function deriveKeyFromPin(pin, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function canUseBackupEncryption() {
  return Boolean(globalThis.crypto?.subtle);
}

export function isValidBackupPin(pin) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export function validatePlainBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid backup data.');
  }

  if (!Array.isArray(payload.companies) || !Array.isArray(payload.projects)) {
    throw new Error('Backup file is missing portfolio data.');
  }
}

export function buildPlainBackupPayload({ companies, projects, preferences }) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    encrypted: false,
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    companies,
    projects,
    preferences,
  };
}

export function parseBackupFile(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid backup file.');
  }

  if (json.format !== BACKUP_FORMAT) {
    throw new Error('This file is not an Investment Portfolio backup.');
  }

  if (json.encrypted === true) {
    if (!json.ciphertext || !json.salt || !json.iv) {
      throw new Error('Encrypted backup file is incomplete.');
    }

    return { encrypted: true, file: json };
  }

  validatePlainBackupPayload(json);
  return { encrypted: false, payload: json };
}

export async function encryptBackupPayload(payload, pin) {
  if (!canUseBackupEncryption()) {
    throw new Error('Encryption is not available in this browser.');
  }

  if (!isValidBackupPin(pin)) {
    throw new Error(`PIN must be ${PIN_LENGTH} digits.`);
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPin(pin, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    encrypted: true,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBackupFile(encryptedFile, pin) {
  if (!canUseBackupEncryption()) {
    throw new Error('Decryption is not available in this browser.');
  }

  if (!isValidBackupPin(pin)) {
    throw new Error(`PIN must be ${PIN_LENGTH} digits.`);
  }

  try {
    const salt = base64ToBytes(encryptedFile.salt);
    const iv = base64ToBytes(encryptedFile.iv);
    const ciphertext = base64ToBytes(encryptedFile.ciphertext);
    const key = await deriveKeyFromPin(pin, salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const payload = JSON.parse(new TextDecoder().decode(decrypted));

    validatePlainBackupPayload(payload);
    return payload;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Could not read decrypted backup data.');
    }

    throw new Error('Incorrect PIN or corrupted backup file.');
  }
}

export function getBackupFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `investment-portfolio-${date}.json`;
}

export function downloadBackupFile(backupObject, filename = getBackupFilename()) {
  const blob = new Blob([JSON.stringify(backupObject, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
