import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está configurada.");

export const sql = neon(process.env.DATABASE_URL);

export async function first<T = any>(text: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = (await sql.query(text, params)) as T[];
  return rows[0];
}

export async function all<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await sql.query(text, params)) as T[];
}
