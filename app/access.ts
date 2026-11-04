import { first } from '@/lib/db';

export const noStore = { 'Cache-Control': 'private, no-store' };

export async function hash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Accepts either a precomputed SHA-256 hash (*_PASSWORD_HASH) or a plain password (*_PASSWORD).
export async function expectedHash(role: 'admin' | 'viewer') {
  const prefix = role === 'admin' ? 'ADMIN' : 'VIEWER';
  const stored = process.env[`${prefix}_PASSWORD_HASH`];
  if (stored) return stored.trim().toLowerCase();
  const plain = process.env[`${prefix}_PASSWORD`];
  return plain ? hash(plain) : null;
}

export async function sessionKey(req: Request) {
  const token = (req.headers.get('cookie') || '')
    .split(';')
    .map(v => v.trim())
    .find(v => v.startsWith('__Host-icthus='))
    ?.split('=')[1];
  return token && /^[a-f0-9]{64}$/.test(token) ? 'session:' + (await hash(token)) : null;
}

export async function roleFor(req: Request) {
  const key = await sessionKey(req);
  if (!key) return null;
  const record = await first<{ value: string }>('SELECT value FROM settings WHERE id=$1', [key]);
  if (!record) return null;
  try {
    const s = JSON.parse(record.value);
    if (!['admin', 'viewer'].includes(s.role)) return null;
    const expected = await expectedHash(s.role);
    return s.expires > Date.now() && expected && s.version === expected ? s.role : null;
  } catch {
    return null;
  }
}

export function clientIp(req: Request) {
  return req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

export function validOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
