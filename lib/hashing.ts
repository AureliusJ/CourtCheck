import { createHmac } from 'crypto';

const salt = process.env.HASH_SALT ?? '';

function hmac(value: string): string {
  return createHmac('sha256', salt).update(value).digest('hex');
}

export function hashDevice(deviceToken: string): string {
  return hmac(deviceToken);
}

export function hashIp(ip: string): string {
  return hmac(ip);
}
