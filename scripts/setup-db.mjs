import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS movements (
  id text PRIMARY KEY,
  date text NOT NULL,
  detail text NOT NULL,
  income bigint NOT NULL,
  expense bigint NOT NULL,
  notes text NOT NULL,
  category text NOT NULL,
  "sourceRow" integer,
  "accountingYear" integer NOT NULL DEFAULT 2026,
  "updatedAt" text,
  deleted integer NOT NULL DEFAULT 0
)`;
await sql`CREATE TABLE IF NOT EXISTS files (
  id text PRIMARY KEY,
  movement text NOT NULL,
  name text NOT NULL,
  type text NOT NULL
)`;
await sql`CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY,
  value text NOT NULL
)`;
await sql`CREATE TABLE IF NOT EXISTS changes (
  id text PRIMARY KEY,
  movement text,
  action text NOT NULL,
  detail text NOT NULL,
  at text NOT NULL,
  actor text NOT NULL
)`;
await sql`CREATE INDEX IF NOT EXISTS files_movement_idx ON files (movement)`;
await sql`CREATE INDEX IF NOT EXISTS changes_at_idx ON changes (at DESC)`;

console.log("Tablas listas.");
