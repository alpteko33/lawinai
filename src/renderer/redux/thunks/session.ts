import { AppDispatch } from '../store';
import { setSession } from '../store';

export const refreshSessionMetadata = () => async (_dispatch: AppDispatch) => {
  try {
    const list = await window.electronAPI?.history?.list({ limit: 50, offset: 0 });
    return list || [];
  } catch (e) {
    console.warn('refreshSessionMetadata error', e);
    return [];
  }
};

export const loadSession = (sessionId: string) => async (dispatch: AppDispatch) => {
  try {
    const session = await window.electronAPI?.history?.load(sessionId);
    if (session) dispatch(setSession(session));
    return session || null;
  } catch (e) {
    console.warn('loadSession error', e);
    return null;
  }
};

export const updateSession = (session: any) => async (dispatch: AppDispatch) => {
  try {
    const saved = await window.electronAPI?.history?.save(session);
    if (saved) dispatch(setSession(saved));
    return saved || session;
  } catch (e) {
    console.warn('updateSession error', e);
    return session;
  }
};


