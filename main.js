const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
// TypeScript dosyalarını (main tarafı) canlı yükleyebilmek için
try { require('ts-node/register'); } catch (_) {}
const path = require('path');
const fs = require('fs').promises;
const Store = require('electron-store');
const chokidar = require('chokidar');

// Güvenli storage için
const store = new Store();

// Veri yönetimi sınıfı
class DataManager {
  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'lawinai');
    this.trainingDataFile = path.join(this.dataPath, 'training-data.json');
    this.embeddingsFile = path.join(this.dataPath, 'embeddings.json');
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      console.log('Veri dizini hazırlandı:', this.dataPath);
    } catch (error) {
      console.error('Veri dizini oluşturulamadı:', error);
    }
  }

  async saveTrainingData(data) {
    try {
      const trainingData = {
        trainingData: data.trainingData || [],
        embeddings: data.embeddings || [],
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };

      await fs.writeFile(this.trainingDataFile, JSON.stringify(trainingData, null, 2));
      console.log('Eğitim verileri kaydedildi:', trainingData.trainingData.length, 'parça');
      return { success: true, count: trainingData.trainingData.length };
    } catch (error) {
      console.error('Eğitim verileri kaydetme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  async loadTrainingData() {
    try {
      const data = await fs.readFile(this.trainingDataFile, 'utf8');
      const parsedData = JSON.parse(data);
      console.log('Eğitim verileri yüklendi:', parsedData.trainingData?.length || 0, 'parça');
      return { success: true, data: parsedData };
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('Eğitim veri dosyası bulunamadı, yeni başlatılıyor');
        return { success: true, data: { trainingData: [], embeddings: [], lastUpdated: null } };
      }
      console.error('Eğitim verileri yükleme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  async clearTrainingData() {
    try {
      await fs.unlink(this.trainingDataFile);
      console.log('Eğitim verileri temizlendi');
      return { success: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true }; // Dosya zaten yok
      }
      console.error('Eğitim verileri temizleme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  async getDataStats() {
    try {
      const stats = await fs.stat(this.trainingDataFile);
      return {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        path: this.trainingDataFile
      };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }
}

// Veri yöneticisi örneği
const dataManager = new DataManager();

// Development mode kontrolü
const isDev = process.env.NODE_ENV === 'development';

// Ana pencere referansı
let mainWindow;

// File watcher for workspace
let workspaceWatcher = null;
let currentWorkspacePath = null;

function createWindow() {
  // Ana pencereyi oluştur
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev, // Development modunda webSecurity'i kapat
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true,
    resizable: true,
    show: false, // Önce yükle, sonra göster
    backgroundColor: '#1a1a1a' // Dark theme
  });

  // Content Security Policy ayarla - sadece production'da
  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const cspPolicy = "default-src 'self' 'unsafe-inline' data: https:; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https: wss:;";
      
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [cspPolicy]
        }
      });
    });
  }

  // Development modunda local server'a bağlan
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    // Production modunda build dosyalarını yükle
    const indexPath = path.join(__dirname, 'dist/index.html');
    console.log('Loading file:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Development modunda focus
    if (isDev) {
      mainWindow.webContents.focus();
    }
  });

  // Pencere kapatıldığında
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // External linkleri default browser'da aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Web güvenliği - dangerous URLs'leri engelle  
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// Uygulama hazır olduğunda
app.whenReady().then(async () => {
  // Main tarafı TS modüllerini başlat
  try {
    const { autocompleteCache } = require('./src/main/cache/AutocompleteLruCache');
    const { registerHistoryIpc } = require('./src/main/ipc/history');
    const { registerAutocompleteIpc } = require('./src/main/ipc/autocomplete');
    const { historyManager } = require('./src/main/history/HistoryManager');
    await historyManager.init();
    await autocompleteCache.init();
    registerHistoryIpc();
    registerAutocompleteIpc();
    console.log('[Main] Cache ve History IPC hazır');
  } catch (e) {
    console.error('[Main] TS modülleri init hatası:', e);
  }
  createWindow();

  // macOS için - dock iconuna tıklandığında pencereyi aç
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Tüm pencereler kapatıldığında (macOS hariç)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// IPC Handlers - Frontend ile backend arası iletişim

// Dosya seçme dialog'u - Enhanced with better logging and error handling
ipcMain.handle('dialog:openFile', async () => {
  try {
    console.log('Electron Main: Opening file dialog');
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Legal Documents', extensions: ['udf', 'pdf', 'doc', 'docx', 'txt'] },
        { name: 'UDF Documents', extensions: ['udf'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    console.log('Electron Main: File dialog result:', result);
    console.log('Electron Main: Result type:', typeof result);
    console.log('Electron Main: Result structure:', {
      canceled: result.canceled,
      filePaths: result.filePaths,
      keys: Object.keys(result)
    });
    
    // Return the full result object instead of just filePaths
    return result;
  } catch (error) {
    console.error('Electron Main: File dialog error:', error);
    return { 
      canceled: true, 
      filePaths: [],
      error: error.message 
    };
  }
});

// Klasör seçme dialog'u - Workspace için
ipcMain.handle('dialog:openFolder', async () => {
  try {
    console.log('Electron Main: Opening folder dialog');
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Proje Klasörünü Seçin',
      buttonLabel: 'Proje Olarak Aç'
    });
    
    console.log('Electron Main: Folder dialog result:', result);
    return result;
  } catch (error) {
    console.error('Electron Main: Folder dialog error:', error);
    return { 
      canceled: true, 
      filePaths: [],
      error: error.message 
    };
  }
});

// Dosya okuma - File System API
ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const fs = require('fs');
    const buffer = fs.readFileSync(filePath);
    return buffer;
  } catch (error) {
    console.error('File read error:', error);
    throw error;
  }
});

// Dosya okuma - Base64 format
ipcMain.handle('fs:readFileAsBase64', async (event, filePath) => {
  try {
    const fs = require('fs');
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('base64');
  } catch (error) {
    console.error('File read as base64 error:', error);
    throw error;
  }
});

// Dosya yazma - Workspace içinde dosya kaydetme
ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Klasör yoksa oluştur
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Dosyayı yaz
    await fs.promises.writeFile(filePath, content, 'utf8');
    console.log('File saved:', filePath);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('File write error:', error);
    throw error;
  }
});

// Workspace dosya listesi - Klasördeki dosyaları listele
ipcMain.handle('fs:listWorkspaceFiles', async (event, workspacePath) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const files = [];
    
    async function scanDirectory(dirPath, relativePath = '') {
      const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const relPath = path.join(relativePath, item.name);
        
        if (item.isDirectory()) {
          // Klasörü de listeye ekle
          const stats = await fs.promises.stat(fullPath);
          files.push({
            name: item.name,
            path: fullPath,
            relativePath: relPath,
            type: 'folder',
            size: 0,
            lastModified: stats.mtime,
            isWorkspaceFile: true
          });
          
          // Alt klasörleri de tara
          await scanDirectory(fullPath, relPath);
        } else {
          // Desteklenen dosya türlerini filtrele
          const ext = path.extname(item.name).toLowerCase();
          const supportedExts = ['.udf', '.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif'];
          
          if (supportedExts.includes(ext)) {
            const stats = await fs.promises.stat(fullPath);
            files.push({
              name: item.name,
              path: fullPath,
              relativePath: relPath,
              type: ext.substring(1),
              size: stats.size,
              lastModified: stats.mtime,
              isWorkspaceFile: true
            });
          }
        }
      }
    }
    
    await scanDirectory(workspacePath);
    console.log(`Found ${files.length} files in workspace:`, workspacePath);
    return files;
  } catch (error) {
    console.error('Workspace file listing error:', error);
    return [];
  }
});

// Workspace file watcher başlat
ipcMain.handle('fs:watchWorkspace', async (event, workspacePath) => {
  try {
    // Önceki watcher'ı kapat
    if (workspaceWatcher) {
      await workspaceWatcher.close();
      workspaceWatcher = null;
    }

    if (!workspacePath) {
      console.log('Workspace watcher stopped');
      return { success: true };
    }

    console.log('Starting workspace watcher for:', workspacePath);
    currentWorkspacePath = workspacePath;

    // Desteklenen dosya türleri
    const supportedExts = ['.udf', '.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif'];
    
    // File watcher başlat
    workspaceWatcher = chokidar.watch(workspacePath, {
      ignored: /(^|[\/\\])\../, // hidden files'ları ignore et
      persistent: true,
      ignoreInitial: false,
      depth: 10 // 10 seviye derinlik
    });

    // File events'leri dinle
    workspaceWatcher
      .on('add', async (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (supportedExts.includes(ext)) {
          const stats = await fs.stat(filePath);
          const fileInfo = {
            name: path.basename(filePath),
            path: filePath,
            relativePath: path.relative(workspacePath, filePath),
            type: ext.substring(1),
            size: stats.size,
            lastModified: stats.mtime,
            isWorkspaceFile: true,
            event: 'add'
          };
          console.log('File added:', fileInfo.name);
          mainWindow?.webContents.send('workspace-file-change', fileInfo);
        }
      })
      .on('unlink', (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (supportedExts.includes(ext)) {
          const fileInfo = {
            path: filePath,
            relativePath: path.relative(workspacePath, filePath),
            event: 'unlink'
          };
          console.log('File removed:', path.basename(filePath));
          mainWindow?.webContents.send('workspace-file-change', fileInfo);
        }
      })
      .on('change', async (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (supportedExts.includes(ext)) {
          const stats = await fs.stat(filePath);
          const fileInfo = {
            name: path.basename(filePath),
            path: filePath,
            relativePath: path.relative(workspacePath, filePath),
            type: ext.substring(1),
            size: stats.size,
            lastModified: stats.mtime,
            isWorkspaceFile: true,
            event: 'change'
          };
          console.log('File changed:', fileInfo.name);
          mainWindow?.webContents.send('workspace-file-change', fileInfo);
        }
      })
      .on('error', error => {
        console.error('Workspace watcher error:', error);
      });

    return { success: true, watchedPath: workspacePath };
  } catch (error) {
    console.error('Workspace watcher setup error:', error);
    return { success: false, error: error.message };
  }
});

// Dosyayı workspace'e kopyala
ipcMain.handle('fs:copyToWorkspace', async (event, sourcePath, workspacePath, fileName) => {
  try {
    const fs = require('fs');
    let targetPath = path.join(workspacePath, fileName);
    
    // Eğer dosya zaten varsa, unique isim ver
    let counter = 1;
    const originalName = fileName;
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    
    while (await fs.promises.access(targetPath).then(() => true).catch(() => false)) {
      const newFileName = `${baseName} (${counter})${ext}`;
      targetPath = path.join(workspacePath, newFileName);
      counter++;
    }
    
    // Hedef dizini oluştur
    const targetDir = path.dirname(targetPath);
    await fs.promises.mkdir(targetDir, { recursive: true });
    
    // Dosyayı kopyala
    await fs.promises.copyFile(sourcePath, targetPath);
    
    console.log('File copied to workspace:', targetPath);
    return { success: true, targetPath, finalFileName: path.basename(targetPath) };
  } catch (error) {
    console.error('File copy error:', error);
    return { success: false, error: error.message };
  }
});

// Drag & Drop file handling - Electron'a özgü
ipcMain.handle('fs:handleDroppedFiles', async (event, filePaths, workspacePath) => {
  try {
    const results = [];
    
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const copyResult = await ipcMain.emit('fs:copyToWorkspace', event, filePath, workspacePath, fileName);
      results.push({
        originalPath: filePath,
        fileName: fileName,
        result: copyResult
      });
    }
    
    console.log(`Processed ${results.length} dropped files`);
    return { success: true, results };
  } catch (error) {
    console.error('Dropped files handling error:', error);
    return { success: false, error: error.message };
  }
});

// Dosyayı veya klasörü sil
ipcMain.handle('fs:deleteFile', async (event, filePath) => {
  try {
    const fs = require('fs');
    const stats = await fs.promises.stat(filePath);
    
    if (stats.isDirectory()) {
      // Klasör ise recursive sil
      await fs.promises.rmdir(filePath, { recursive: true });
      console.log('Folder deleted:', filePath);
    } else {
      // Dosya ise unlink
      await fs.promises.unlink(filePath);
      console.log('File deleted:', filePath);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }
});

// Dosyayı yeniden adlandır
ipcMain.handle('fs:renameFile', async (event, oldPath, newPath) => {
  try {
    const fs = require('fs');
    await fs.promises.rename(oldPath, newPath);
    console.log('File renamed:', oldPath, '->', newPath);
    return { success: true, newPath };
  } catch (error) {
    console.error('File rename error:', error);
    return { success: false, error: error.message };
  }
});

// Klasör oluştur
ipcMain.handle('fs:createFolder', async (event, folderPath) => {
  try {
    const fs = require('fs');
    await fs.promises.mkdir(folderPath, { recursive: true });
    console.log('Folder created:', folderPath);
    return { success: true, path: folderPath };
  } catch (error) {
    console.error('Folder create error:', error);
    return { success: false, error: error.message };
  }
});

// Dosya oluştur
ipcMain.handle('fs:createFile', async (event, filePath, content = '') => {
  try {
    const fs = require('fs');
    // Hedef dizini oluştur
    const targetDir = path.dirname(filePath);
    await fs.promises.mkdir(targetDir, { recursive: true });
    
    // Dosyayı oluştur
    await fs.promises.writeFile(filePath, content, 'utf8');
    console.log('File created:', filePath);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('File create error:', error);
    return { success: false, error: error.message };
  }
});

// Ayarları kaydet
ipcMain.handle('store:set', async (event, key, value) => {
  store.set(key, value);
  return true;
});

// Ayarları al
ipcMain.handle('store:get', async (event, key) => {
  return store.get(key);
});

// Eğitim verileri IPC handlers
ipcMain.handle('training:save', async (event, data) => {
  console.log('Eğitim verileri kaydediliyor...');
  return await dataManager.saveTrainingData(data);
});

ipcMain.handle('training:load', async () => {
  console.log('Eğitim verileri yükleniyor...');
  return await dataManager.loadTrainingData();
});

ipcMain.handle('training:clear', async () => {
  console.log('Eğitim verileri temizleniyor...');
  return await dataManager.clearTrainingData();
});

ipcMain.handle('training:stats', async () => {
  return await dataManager.getDataStats();
});

// Uygulama versiyonu
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// Additional FS helpers
ipcMain.handle('fs:readFileText', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    console.error('File read text error:', error);
    throw error;
  }
});

// Rules management under workspace
ipcMain.handle('rules:list', async (event, workspacePath) => {
  try {
    const baseDir = path.join(workspacePath, '.legal', 'rules');
    async function walk(dir, acc) {
      let items = [];
      try {
        items = await fs.readdir(dir, { withFileTypes: true });
      } catch (_) {
        return acc;
      }
      for (const it of items) {
        const full = path.join(dir, it.name);
        if (it.isDirectory()) {
          await walk(full, acc);
        } else if (it.isFile() && it.name.toLowerCase().endsWith('.md')) {
          acc.push(full);
        }
      }
      return acc;
    }
    const files = await walk(baseDir, []);
    return files;
  } catch (error) {
    console.error('rules:list error:', error);
    return [];
  }
});

ipcMain.handle('rules:ensureDir', async (event, workspacePath) => {
  try {
    const dir = path.join(workspacePath, '.legal', 'rules');
    await fs.mkdir(dir, { recursive: true });
    return { success: true, dir };
  } catch (error) {
    console.error('rules:ensureDir error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rules:read', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    console.error('rules:read error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rules:write', async (event, workspacePath, fileName, content) => {
  try {
    const dir = path.join(workspacePath, '.legal', 'rules');
    await fs.mkdir(dir, { recursive: true });
    const target = path.join(dir, fileName);
    await fs.writeFile(target, content, 'utf8');
    return { success: true, path: target };
  } catch (error) {
    console.error('rules:write error:', error);
    return { success: false, error: error.message };
  }
});

// Console log'ları main process'te göster (development)
if (isDev) {
  ipcMain.on('console:log', (event, ...args) => {
    console.log('[Renderer]:', ...args);
  });
} 