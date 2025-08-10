import { ipcMain } from 'electron';
import { historyManager, Session } from '../history/HistoryManager';

export function registerHistoryIpc() {
  ipcMain.handle('history:list', async (_e, params: { limit?: number; offset?: number }) => {
    return await historyManager.list(params || {});
  });

  ipcMain.handle('history:load', async (_e, id: string) => {
    return await historyManager.load(id);
  });

  ipcMain.handle('history:save', async (_e, session: Session) => {
    return await historyManager.save(session);
  });

  ipcMain.handle('history:delete', async (_e, id: string) => {
    return await historyManager.delete(id);
  });

  ipcMain.handle('history:clear', async () => {
    await historyManager.clearAll();
    return true;
  });
}


