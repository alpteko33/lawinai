import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Güvenli storage için
const store = new Store();

// Development mode kontrolü
const isDev = process.env.NODE_ENV === 'development';

// Ana pencere referansı
let mainWindow;

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
      webSecurity: true
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true,
    resizable: true,
    show: false, // Önce yükle, sonra göster
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#1a1a1a' // Dark theme
  });

  // Development modunda local server'a bağlan
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    // Production modunda build dosyalarını yükle
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
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
}

// Uygulama hazır olduğunda
app.whenReady().then(() => {
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

// Dosya seçme dialog'u
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Word Documents', extensions: ['doc', 'docx'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (canceled) {
    return null;
  } else {
    return filePaths;
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

// API key doğrulama için güvenli storage
ipcMain.handle('secure:setApiKey', async (event, apiKey) => {
  // Gerçek uygulamada şifreleme kullanılmalı
  store.set('apiKey', apiKey);
  return true;
});

ipcMain.handle('secure:getApiKey', async () => {
  return store.get('apiKey', null);
});

// Uygulama versiyonu
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// Console log'ları main process'te göster (development)
if (isDev) {
  ipcMain.on('console:log', (event, ...args) => {
    console.log('[Renderer]:', ...args);
  });
} 