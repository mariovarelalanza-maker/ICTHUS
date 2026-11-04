import { put, get } from '@vercel/blob';
import { sql, first, all } from '@/lib/db';
import { roleFor, noStore, validOrigin } from '../../access';
import { isValidDate } from '../../financial-year';
import original from '../../../data/original.json';

const MOVEMENT_COLUMNS = 'id,date,detail,income::float8 AS income,expense::float8 AS expense,notes,category,"sourceRow","accountingYear","updatedAt"';
const blobPath = (id: string) => 'comprobantes/' + id;

export async function GET(req: Request) {
  if (!(await roleFor(req))) return Response.json({ error: 'Iniciá sesión para continuar.' }, { status: 401, headers: noStore });
  const url = new URL(req.url);

  if (url.searchParams.has('file')) {
    const id = url.searchParams.get('file')!;
    const f = await first<{ type: string }>('SELECT type FROM files WHERE id=$1', [id]);
    if (!f) return new Response('No encontrado', { status: 404 });
    const result = await get(blobPath(id), { access: 'private' });
    if (!result || result.statusCode !== 200) return new Response('No encontrado', { status: 404 });
    return new Response(result.stream, { headers: { 'Content-Type': f.type, ...noStore } });
  }

  const [history, rows, files, imported] = await Promise.all([
    all('SELECT * FROM changes ORDER BY at DESC,id DESC LIMIT 30'),
    all(`SELECT ${MOVEMENT_COLUMNS} FROM movements WHERE deleted=0 ORDER BY date DESC,id DESC`),
    all('SELECT * FROM files'),
    first("SELECT id FROM settings WHERE id='imported'"),
  ]);
  return Response.json({ rows, files, imported: !!imported, history, lastModified: history[0] || null }, { headers: noStore });
}

export async function POST(req: Request) {
  if ((await roleFor(req)) !== 'admin') return Response.json({ error: 'Solo Admin puede modificar registros.' }, { status: 403, headers: noStore });
  if (!validOrigin(req)) return Response.json({ error: 'Origen inválido' }, { status: 403 });
  try {
    const now = new Date().toISOString();
    const audit = (movement: string | null, action: string, detail: string) =>
      sql.query('INSERT INTO changes(id,movement,action,detail,at,actor) VALUES($1,$2,$3,$4,$5,$6)', [crypto.randomUUID(), movement, action, detail, now, 'Admin']);

    if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File;
      const movement = String(form.get('movement'));
      if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)
        return Response.json({ error: 'Usá JPG, PNG o WebP de hasta 10 MB.' }, { status: 400 });
      const row = await first<{ detail: string }>('SELECT detail FROM movements WHERE id=$1 AND deleted=0', [movement]);
      if (!row) return new Response('Movimiento no encontrado', { status: 404 });
      const id = crypto.randomUUID();
      await put(blobPath(id), file, { access: 'private', contentType: file.type, addRandomSuffix: false });
      await sql.transaction([
        sql.query('INSERT INTO files(id,movement,name,type) VALUES($1,$2,$3,$4)', [id, movement, file.name, file.type]),
        sql.query('UPDATE movements SET "updatedAt"=$1 WHERE id=$2', [now, movement]),
        audit(movement, 'Comprobante adjuntado', row.detail + ' · ' + file.name),
      ]);
      return Response.json({ id, updatedAt: now });
    }

    const v = (await req.json()) as any;

    if (v.action === 'import') {
      if (await first("SELECT id FROM settings WHERE id='imported'")) return Response.json({ ok: true });
      for (const f of original.images)
        await put(blobPath(f.id), Buffer.from(f.data, 'base64'), { access: 'private', contentType: f.type, addRandomSuffix: false, allowOverwrite: true });
      await sql.transaction([
        ...original.rows.map(r =>
          sql.query('INSERT INTO movements(id,date,detail,income,expense,notes,category,"sourceRow","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING', [
            r.id, r.date, r.detail, r.income, r.expense, r.notes, r.category, r.sourceRow, now,
          ]),
        ),
        ...original.images.map(f =>
          sql.query('INSERT INTO files(id,movement,name,type) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [f.id, 'original-' + f.row, f.name, f.type]),
        ),
        sql.query("INSERT INTO settings(id,value) VALUES('imported','1') ON CONFLICT DO NOTHING"),
        audit(null, 'Importación', 'Hoja de finanzas importada'),
      ]);
      return Response.json({ ok: true });
    }

    if (v.action === 'delete') {
      const row = await first<{ detail: string }>('SELECT detail FROM movements WHERE id=$1 AND deleted=0', [v.id]);
      if (!row) return Response.json({ error: 'Movimiento no encontrado.' }, { status: 404 });
      await sql.transaction([
        sql.query('UPDATE movements SET deleted=1,"updatedAt"=$1 WHERE id=$2', [now, v.id]),
        audit(v.id, 'Movimiento eliminado', row.detail),
      ]);
      return Response.json({ ok: true, updatedAt: now });
    }

    const r = v.row;
    if (
      !r || typeof r.detail !== 'string' || !r.detail.trim() || r.detail.length > 500 ||
      !(isValidDate(r.date) || (r.date === '' && r.id)) ||
      ![r.income, r.expense].every(n => Number.isSafeInteger(n) && n >= 0 && n < 1e12) ||
      !(r.income + r.expense)
    )
      return Response.json({ error: 'Revisá fecha, detalle e importe.' }, { status: 400 });

    const id = r.id || crypto.randomUUID();
    const existing = await first<{ deleted: number; accountingYear: number }>('SELECT deleted,"accountingYear" FROM movements WHERE id=$1', [id]);
    if (existing?.deleted) return Response.json({ error: 'Este movimiento fue eliminado.' }, { status: 409 });
    if (!r.date && !existing) return Response.json({ error: 'La fecha es obligatoria.' }, { status: 400 });
    const fiscalYear = r.date ? Number(r.date.slice(0, 4)) : existing!.accountingYear;

    await sql.transaction([
      sql.query(
        'INSERT INTO movements(id,date,detail,income,expense,notes,category,"updatedAt","accountingYear") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET date=excluded.date,detail=excluded.detail,income=excluded.income,expense=excluded.expense,notes=excluded.notes,category=excluded.category,"updatedAt"=excluded."updatedAt","accountingYear"=excluded."accountingYear"',
        [id, r.date, r.detail, r.income, r.expense, String(r.notes || '').slice(0, 3000), String(r.category || 'General').slice(0, 100), now, fiscalYear],
      ),
      audit(id, existing ? 'Movimiento editado' : 'Movimiento creado', r.detail),
    ]);
    return Response.json({ id, updatedAt: now });
  } catch (e) {
    console.error('Save error:', e);
    return Response.json({ error: 'No se pudo guardar. Intentá nuevamente.' }, { status: 500 });
  }
}
