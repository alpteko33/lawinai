import Database from 'sqlite-async';
import { Mutex } from 'async-mutex';
import path from 'path';
import { ensureIndexDir } from '../paths/paths';

type CacheRow = { key: string; value: string; timestamp: number };

/**
 * Autocomplete için SQLite tabanlı LRU cache.
 * Tablo: cache(key TEXT PRIMARY KEY, value TEXT NOT NULL, timestamp INTEGER NOT NULL)
 */
export class AutocompleteLruCache {
  private db: Database | null = null;
  private readonly capacity: number;
  private readonly mutex = new Mutex();

  constructor(capacity = 1000) {
    this.capacity = capacity;
  }

  async init(): Promise<void> {
    const dir = await ensureIndexDir();
    const dbPath = path.join(dir, 'autocomplete-cache.sqlite');
    this.db = await Database.open(dbPath);
    await this.db.run('PRAGMA journal_mode=WAL');
    await this.db.run('PRAGMA busy_timeout=3000');
    await this.db.run(
      'CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, timestamp INTEGER NOT NULL)'
    );
    await this.db.run('CREATE INDEX IF NOT EXISTS idx_cache_timestamp ON cache(timestamp)');
  }

  /** En uzun prefix eşleşmesiyle değer getirir ve LRU için timestamp günceller. */
  async get(prefix: string): Promise<string | null> {
    if (!this.db) return null;
    return this.mutex.runExclusive(async () => {
      const q = `SELECT key, value, timestamp FROM cache WHERE key LIKE ? ORDER BY LENGTH(key) DESC LIMIT 1`;
      const row = (await this.db!.get(q, [`${prefix}%`])) as CacheRow | undefined;
      if (!row) return null;
      const now = Date.now();
      await this.db!.run('UPDATE cache SET timestamp = ? WHERE key = ?', [now, row.key]);
      return row.value;
    });
  }

  /** Yeni değeri ekler/günceller; kapasiteyi aşarsa en eski kaydı siler. */
  async put(prefix: string, completion: string): Promise<void> {
    if (!this.db) return;
    await this.mutex.runExclusive(async () => {
      const now = Date.now();
      await this.db!.run(
        'INSERT INTO cache(key, value, timestamp) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, timestamp=excluded.timestamp',
        [prefix, completion, now]
      );
      const countRow = (await this.db!.get('SELECT COUNT(1) as c FROM cache')) as { c: number };
      if (countRow.c > this.capacity) {
        const overflow = countRow.c - this.capacity;
        await this.db!.run(
          `DELETE FROM cache WHERE key IN (
             SELECT key FROM cache ORDER BY timestamp ASC LIMIT ?
           )`,
          [overflow]
        );
      }
    });
  }
}

export const autocompleteCache = new AutocompleteLruCache(1000);


