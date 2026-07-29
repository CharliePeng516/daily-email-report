import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Lazy on purpose: Next's build-time module tracing imports this file even
// for force-dynamic routes, and must not require DATABASE_URL to exist yet.
let sql: postgres.Sql | undefined;
let dbInstance: PostgresJsDatabase | undefined;

export function getDb(): PostgresJsDatabase {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('Missing DATABASE_URL environment variable.');
    }
    sql = postgres(databaseUrl, { max: 5 });
    dbInstance = drizzle(sql);
  }
  return dbInstance;
}
