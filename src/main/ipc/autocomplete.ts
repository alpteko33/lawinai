import { ipcMain } from 'electron';
import { autocompleteCache } from '../cache/AutocompleteLruCache';

export function registerAutocompleteIpc() {
  ipcMain.handle('autocomplete:get', async (_e, prefix: string) => {
    const val = await autocompleteCache.get(prefix);
    return val ?? null;
  });

  ipcMain.handle('autocomplete:put', async (_e, prefix: string, completion: string) => {
    await autocompleteCache.put(prefix, completion);
    return true;
  });
}


