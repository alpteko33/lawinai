import { ensureSessionsDir } from '../paths/paths';
import path from 'path';
import fs from 'fs/promises';

export type ChatMessage = {
  id: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  thinkingSteps?: Array<{ type: string; text: string; ts?: number }>;
};

export type ChatHistoryItem = {
  id: string;
  title: string;
  timestamp: string;
  messageCount: number;
};

export type SessionMetadata = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

/** Sohbet geçmişini JSON dosyaları üzerinde yöneten sınıf. */
export class HistoryManager {
  private sessionsDir!: string;
  private indexFile!: string;

  async init(): Promise<void> {
    this.sessionsDir = await ensureSessionsDir();
    this.indexFile = path.join(this.sessionsDir, 'sessions.json');
    await fs.mkdir(this.sessionsDir, { recursive: true });
    // sessions.json yoksa oluştur
    try {
      await fs.access(this.indexFile);
    } catch (_) {
      await fs.writeFile(this.indexFile, JSON.stringify({ sessions: [] }, null, 2), 'utf8');
    }
  }

  private async safeReadJSON(filePath: string): Promise<any> {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn('JSON read/parse failed, resetting file:', filePath, (err as Error).message);
      await fs.writeFile(filePath, JSON.stringify({ sessions: [] }, null, 2), 'utf8');
      return { sessions: [] };
    }
  }

  /** PII maskesi (örnek, basit) */
  private maskPII(text: string): string {
    if (!text) return text;
    return text.replace(/\b\d{11}\b/g, '***TC***');
  }

  /** Listeleme: metadata döner. */
  async list(params: { limit?: number; offset?: number } = {}): Promise<SessionMetadata[]> {
    await this.initIfNeeded();
    const { limit = 50, offset = 0 } = params;
    const data = await this.safeReadJSON(this.indexFile);
    const items: SessionMetadata[] = (data.sessions || []).slice(offset, offset + limit);
    return items;
  }

  /** Tek bir oturumu yükler. */
  async load(id: string): Promise<Session | null> {
    await this.initIfNeeded();
    const file = path.join(this.sessionsDir, `${id}.json`);
    try {
      const raw = await fs.readFile(file, 'utf8');
      return JSON.parse(raw) as Session;
    } catch (err) {
      if ((err as any).code === 'ENOENT') return null;
      console.warn('Session read error, returning null:', (err as Error).message);
      return null;
    }
  }

  /** Oturumu kaydeder ve index dosyasını günceller. */
  async save(session: Session): Promise<Session> {
    await this.initIfNeeded();
    const now = new Date().toISOString();
    const sanitized: Session = {
      ...session,
      title: session.title || 'Yeni Sohbet',
      createdAt: session.createdAt || now,
      updatedAt: now,
      messages: (session.messages || []).map((m) => ({
        ...m,
        content: this.maskPII(m.content),
      })),
    };
    const file = path.join(this.sessionsDir, `${sanitized.id}.json`);
    await fs.writeFile(file, JSON.stringify(sanitized, null, 2), 'utf8');

    // index güncelle
    const data = await this.safeReadJSON(this.indexFile);
    const meta: SessionMetadata = {
      id: sanitized.id,
      title: sanitized.title,
      createdAt: sanitized.createdAt,
      updatedAt: sanitized.updatedAt,
    };
    const existingIdx = (data.sessions || []).findIndex((s: SessionMetadata) => s.id === sanitized.id);
    if (existingIdx >= 0) data.sessions[existingIdx] = meta;
    else data.sessions.unshift(meta);
    await fs.writeFile(this.indexFile, JSON.stringify(data, null, 2), 'utf8');
    return sanitized;
  }

  /** Belirli bir oturumu siler. */
  async delete(id: string): Promise<boolean> {
    await this.initIfNeeded();
    const file = path.join(this.sessionsDir, `${id}.json`);
    try {
      await fs.unlink(file);
    } catch (_) {}
    // index güncelle
    const data = await this.safeReadJSON(this.indexFile);
    data.sessions = (data.sessions || []).filter((s: SessionMetadata) => s.id !== id);
    await fs.writeFile(this.indexFile, JSON.stringify(data, null, 2), 'utf8');
    return true;
  }

  /** Tüm oturumları siler. */
  async clearAll(): Promise<void> {
    await this.initIfNeeded();
    // index reset
    await fs.writeFile(this.indexFile, JSON.stringify({ sessions: [] }, null, 2), 'utf8');
    // dosyaları temizle
    try {
      const entries = await fs.readdir(this.sessionsDir);
      await Promise.all(
        entries
          .filter((f) => f.endsWith('.json') && f !== 'sessions.json')
          .map((f) => fs.unlink(path.join(this.sessionsDir, f)))
      );
    } catch (err) {
      console.warn('clearAll error:', (err as Error).message);
    }
  }

  private initialized = false;
  private async initIfNeeded() {
    if (!this.initialized) {
      await this.init();
      this.initialized = true;
    }
  }
}

export const historyManager = new HistoryManager();


