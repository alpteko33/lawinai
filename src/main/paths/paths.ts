import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

/**
 * Uygulama `userData` dizininde gereksinim duyulan klasörleri hazırlar.
 * - root: <userData>/lawinai
 * - sessions: <root>/sessions
 * - index: <root>/index
 */
export async function ensureUserData(): Promise<{
  rootDir: string;
  sessionsDir: string;
  indexDir: string;
}> {
  const userDataRoot = path.join(app.getPath('userData'), 'lawinai');
  const sessionsDir = path.join(userDataRoot, 'sessions');
  const indexDir = path.join(userDataRoot, 'index');
  await fs.mkdir(userDataRoot, { recursive: true });
  await fs.mkdir(sessionsDir, { recursive: true });
  await fs.mkdir(indexDir, { recursive: true });
  return { rootDir: userDataRoot, sessionsDir, indexDir };
}

/** Electron userData altında `sessions/` klasörünü garanti eder. */
export async function ensureSessionsDir(): Promise<string> {
  const { sessionsDir } = await ensureUserData();
  return sessionsDir;
}

/** Electron userData altında `index/` klasörünü garanti eder. */
export async function ensureIndexDir(): Promise<string> {
  const { indexDir } = await ensureUserData();
  return indexDir;
}


