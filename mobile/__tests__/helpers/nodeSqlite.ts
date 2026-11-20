// Node's built-in SQLite behind the same SqlDb interface the app uses with expo-sqlite.
import type { SqlDb, SqlValue } from '../../src/local/db';

export function memoryDb(): SqlDb {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  return {
    exec: async (sql: string) => { db.exec(sql); },
    run: async (sql: string, params: SqlValue[] = []) => { db.prepare(sql).run(...params); },
    all: async (sql: string, params: SqlValue[] = []) => db.prepare(sql).all(...params).map((row: object) => ({ ...row })),
    get: async (sql: string, params: SqlValue[] = []) => { const row = db.prepare(sql).get(...params); return row ? { ...row } : null; },
  } as SqlDb;
}
