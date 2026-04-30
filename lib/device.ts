'use client';

const STORAGE_KEY = 'court_device_hash';

export function getOrCreateDeviceHash(): string {
  let hash = localStorage.getItem(STORAGE_KEY);
  if (!hash) {
    const buf = crypto.getRandomValues(new Uint8Array(16));
    hash = Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem(STORAGE_KEY, hash);
  }
  return hash;
}
