import { contextBridge, ipcRenderer } from 'electron';

// Güvenli API bridge - frontend'den erişilebilir
contextBridge.exposeInMainWorld('electronAPI', {
  // Dosya işlemleri
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  
  // Storage işlemleri
  store: {
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    get: (key) => ipcRenderer.invoke('store:get', key)
  },
  
  // Güvenli API key yönetimi
  security: {
    setApiKey: (apiKey) => ipcRenderer.invoke('secure:setApiKey', apiKey),
    getApiKey: () => ipcRenderer.invoke('secure:getApiKey')
  },
  
  // Uygulama bilgileri
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },
  
  // Debug için (sadece development)
  console: {
    log: (...args) => ipcRenderer.send('console:log', ...args)
  }
});

// Platform bilgileri
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
});

// Console.log override (development mode)
if (process.env.NODE_ENV === 'development') {
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    ipcRenderer.send('console:log', ...args);
  };
} 