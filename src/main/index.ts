import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';

// Config stored in %APPDATA%/course-schedule-visualizer/config.json
const CONFIG_DIR = join(app.getPath('userData'));
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

interface AppConfig {
  storagePath: string;
}

function readConfig(): AppConfig | null {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return null;
}

function writeConfig(config: AppConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Dev: load from Vite dev server; Prod: load built index.html
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

// --- IPC Handlers ---

ipcMain.handle('storage:getConfig', () => {
  return readConfig();
});

ipcMain.handle('storage:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select shared storage folder'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const storagePath = result.filePaths[0];
  const config: AppConfig = { storagePath };
  writeConfig(config);
  return config;
});

ipcMain.handle('storage:changeFolder', async () => {
  const current = readConfig();
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select new shared storage folder',
    defaultPath: current?.storagePath
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const storagePath = result.filePaths[0];
  const config: AppConfig = { storagePath };
  writeConfig(config);
  return config;
});

ipcMain.handle('storage:read', (_event, filename: string) => {
  const config = readConfig();
  if (!config) return { data: null, lastModified: 0 };

  const filePath = join(config.storagePath, filename);
  try {
    if (!existsSync(filePath)) return { data: null, lastModified: 0 };
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    const stats = statSync(filePath);
    return { data, lastModified: stats.mtimeMs };
  } catch {
    return { data: null, lastModified: 0 };
  }
});

ipcMain.handle('storage:write', (_event, filename: string, req: { data: unknown; expectedLastModified: number }) => {
  const config = readConfig();
  if (!config) return { success: false, conflict: false, lastModified: 0 };

  const filePath = join(config.storagePath, filename);

  // Ensure directory exists
  if (!existsSync(config.storagePath)) {
    mkdirSync(config.storagePath, { recursive: true });
  }

  // Conflict check: if file exists and expectedLastModified > 0, compare mtimeMs
  if (existsSync(filePath) && req.expectedLastModified > 0) {
    const stats = statSync(filePath);
    if (Math.abs(stats.mtimeMs - req.expectedLastModified) > 50) {
      // Conflict detected - return current file contents
      try {
        const currentData = JSON.parse(readFileSync(filePath, 'utf-8'));
        return {
          success: false,
          conflict: true,
          lastModified: stats.mtimeMs,
          currentData
        };
      } catch {
        // If we can't read the conflicting file, just report conflict
        return { success: false, conflict: true, lastModified: stats.mtimeMs };
      }
    }
  }

  // Write the file
  try {
    writeFileSync(filePath, JSON.stringify(req.data, null, 2), 'utf-8');
    const stats = statSync(filePath);
    return { success: true, conflict: false, lastModified: stats.mtimeMs };
  } catch {
    return { success: false, conflict: false, lastModified: 0 };
  }
});

ipcMain.handle('storage:selectCsvFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select CSV export folder'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('storage:writeCsv', (_event, folderPath: string, filename: string, csvContent: string) => {
  try {
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }
    writeFileSync(join(folderPath, filename), csvContent, 'utf-8');
    return true;
  } catch {
    return false;
  }
});

// --- App lifecycle ---

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
