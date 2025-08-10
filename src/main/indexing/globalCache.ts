import Database from 'sqlite-async';
import path from 'path';
import { ensureIndexDir } from '../paths/paths';

/** Basit artefakt global cache iskeleti. */
export class GlobalCache {
  private db: Database | null = null;

  async init(): Promise<void> {
    const dir = await ensureIndexDir();
    const dbPath = path.join(dir, 'global-cache.sqlite');
    this.db = await Database.open(dbPath);
    await this.db.run('PRAGMA journal_mode=WAL');
    await this.db.run('PRAGMA busy_timeout=3000');
    await this.db.run(
      `CREATE TABLE IF NOT EXISTS tag_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag TEXT UNIQUE NOT NULL
      )`
    );
    await this.db.run(
      `CREATE TABLE IF NOT EXISTS global_cache (
        key TEXT PRIMARY KEY,
        value BLOB,
        updated_at INTEGER NOT NULL
      )`
    );
  }

  async computeOrAddTag(tag: string): Promise<number> {
    if (!this.db) throw new Error('db not initialized');
    await this.db.run('INSERT OR IGNORE INTO tag_catalog(tag) VALUES(?)', [tag]);
    const row = await this.db.get('SELECT id FROM tag_catalog WHERE tag = ?', [tag]);
    return (row?.id as number) || 0;
  }

  async deleteOrRemoveTag(tag: string): Promise<void> {
    if (!this.db) throw new Error('db not initialized');
    await this.db.run('DELETE FROM tag_catalog WHERE tag = ?', [tag]);
  }

  // Güncelleme akışı iskeleti
  async update(key: string, value: Buffer | string): Promise<void> {
    if (!this.db) throw new Error('db not initialized');
    const now = Date.now();
    await this.db.run(
      'INSERT INTO global_cache(key, value, updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
      [key, value, now]
    );
  }
}

export const globalCache = new GlobalCache();


