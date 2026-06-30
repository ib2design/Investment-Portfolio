import { PIN_HASH_KEY, PIN_LENGTH } from './constants.js';

const FALLBACK_HASH_PREFIX = 'local:';

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPinSha256(pin) {
  const data = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return bytesToHex(new Uint8Array(hashBuffer));
}

function hashPinFallback(pin) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < pin.length; i += 1) {
    const code = pin.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }

  return `${FALLBACK_HASH_PREFIX}${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

async function hashPin(pin) {
  if (globalThis.crypto?.subtle) {
    return hashPinSha256(pin);
  }

  return hashPinFallback(pin);
}

export function hasPin() {
  return Boolean(localStorage.getItem(PIN_HASH_KEY));
}

export function isValidPin(pin) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function verifyPin(pin) {
  const stored = localStorage.getItem(PIN_HASH_KEY);

  if (!stored) {
    return true;
  }

  if (stored.startsWith(FALLBACK_HASH_PREFIX)) {
    return stored === hashPinFallback(pin);
  }

  if (!globalThis.crypto?.subtle) {
    return false;
  }

  return stored === (await hashPinSha256(pin));
}

export async function savePin(pin) {
  localStorage.setItem(PIN_HASH_KEY, await hashPin(pin));
}
