const { contextBridge, ipcRenderer } = require('electron');

// Güvenli API bridge - frontend'den erişilebilir
contextBridge.exposeInMainWorld('electronAPI', {
  // Dosya işlemleri
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  readFileAsBase64: (filePath) => ipcRenderer.invoke('fs:readFileAsBase64', filePath),
  
  // Storage işlemleri
  store: {
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    get: (key) => ipcRenderer.invoke('store:get', key)
  },
  
  // Eğitim verileri işlemleri
  training: {
    save: (data) => ipcRenderer.invoke('training:save', data),
    load: () => ipcRenderer.invoke('training:load'),
    clear: () => ipcRenderer.invoke('training:clear'),
    stats: () => ipcRenderer.invoke('training:stats')
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