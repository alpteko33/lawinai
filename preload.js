const { contextBridge, ipcRenderer } = require('electron');

// Güvenli API bridge - frontend'den erişilebilir
contextBridge.exposeInMainWorld('electronAPI', {
  // Dosya işlemleri
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  readFileAsBase64: (filePath) => ipcRenderer.invoke('fs:readFileAsBase64', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  listWorkspaceFiles: (workspacePath) => ipcRenderer.invoke('fs:listWorkspaceFiles', workspacePath),
  watchWorkspace: (workspacePath) => ipcRenderer.invoke('fs:watchWorkspace', workspacePath),
  copyToWorkspace: (sourcePath, workspacePath, fileName) => ipcRenderer.invoke('fs:copyToWorkspace', sourcePath, workspacePath, fileName),
  handleDroppedFiles: (filePaths, workspacePath) => ipcRenderer.invoke('fs:handleDroppedFiles', filePaths, workspacePath),
  
  // File watcher events için listener
  onWorkspaceFileChange: (callback) => {
    ipcRenderer.on('workspace-file-change', (event, fileInfo) => callback(fileInfo));
  },
  removeWorkspaceFileListener: () => {
    ipcRenderer.removeAllListeners('workspace-file-change');
  },
  
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
  // Rules helpers
  rules: {
    listRuleFiles: (workspacePath) => ipcRenderer.invoke('rules:list', workspacePath),
    ensureDir: (workspacePath) => ipcRenderer.invoke('rules:ensureDir', workspacePath),
    read: (filePath) => ipcRenderer.invoke('rules:read', filePath),
    write: (workspacePath, fileName, content) => ipcRenderer.invoke('rules:write', workspacePath, fileName, content),
  },
  fs: {
    readFileText: (filePath) => ipcRenderer.invoke('fs:readFileText', filePath),
  },

  // History API
  history: {
    list: (params) => ipcRenderer.invoke('history:list', params),
    load: (id) => ipcRenderer.invoke('history:load', id),
    save: (session) => ipcRenderer.invoke('history:save', session),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
    clear: () => ipcRenderer.invoke('history:clear'),
  },

  // Autocomplete cache API
  autocompleteCache: {
    get: (prefix) => ipcRenderer.invoke('autocomplete:get', prefix),
    put: (prefix, completion) => ipcRenderer.invoke('autocomplete:put', prefix, completion),
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