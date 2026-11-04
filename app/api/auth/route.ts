import { sql, first } from '@/lib/db';
import { hash, roleFor, sessionKey, noStore, validOrigin, expectedHash, clientIp } from '../../access';

export async function GET(req: Request) {
  return Response.json({ role: await roleFor(req) }, { headers: noStore });
}

export async function POST(req: Request) {
  if (!validOrigin(req)) return Response.json({ error: 'Origen inválido' }, { status: 403, headers: noStore });
  try {
    const v: any = await req.json();
    if (v.action === 'logout') {
      const key = await sessionKey(req);
      if (key) await sql.query('DELETE FROM settings WHERE id=$1', [key]);
      return Response.json({ ok: true }, { headers: { ...noStore, 'Set-Cookie': '__Host-icthus=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0' } });
    }

    const bucket = Math.floor(Date.now() / 900000);
    const limitKey = 'login:' + (await hash(clientIp(req))) + ':' + bucket;
    const attempt = await first<{ value: string }>(
      "INSERT INTO settings(id,value) VALUES($1,'1') ON CONFLICT(id) DO UPDATE SET value=(settings.value::integer+1)::text RETURNING value",
      [limitKey],
    );
    if (Number(attempt?.value) > 12) return Response.json({ error: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' }, { status: 429, headers: noStore });

    const user = String(v.user || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const role = user === 'ADMIN' ? 'admin' : user === 'GUIA' ? 'viewer' : null;
    const expected = role ? await expectedHash(role) : null;
    const supplied = await hash(String(v.password || '').slice(0, 256));
    let mismatch = expected?.length === supplied.length ? 0 : 1;
    for (let i = 0; i < supplied.length; i++) mismatch |= supplied.charCodeAt(i) ^ (expected?.charCodeAt(i) || 0);
    if (!role || !expected || mismatch) return Response.json({ error: 'Usuario o contraseña incorrectos.' }, { status: 401, headers: noStore });

    const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n => n.toString(16).padStart(2, '0')).join('');
    await sql.query('INSERT INTO settings(id,value) VALUES($1,$2)', [
      'session:' + (await hash(token)),
      JSON.stringify({ role, version: expected, expires: Date.now() + 43200000 }),
    ]);
    return Response.json({ role }, { headers: { ...noStore, 'Set-Cookie': '__Host-icthus=' + token + '; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=43200' } });
  } catch (e) {
    console.error('Login error:', e);
    return Response.json({ error: 'No se pudo iniciar sesión.' }, { status: 500, headers: noStore });
  }
}
