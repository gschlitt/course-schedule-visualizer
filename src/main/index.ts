import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, statSync, renameSync, unlinkSync } from 'fs';

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

// --- Error logging ---
const ERROR_LOG_PATH = join(CONFIG_DIR, 'error.log');
const MAX_LOG_SIZE = 512 * 1024; // 512 KB

function appendErrorLog(entry: string): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    // Rotate if too large
    if (existsSync(ERROR_LOG_PATH) && statSync(ERROR_LOG_PATH).size > MAX_LOG_SIZE) {
      const bakPath = ERROR_LOG_PATH + '.bak';
      if (existsSync(bakPath)) unlinkSync(bakPath);
      renameSync(ERROR_LOG_PATH, bakPath);
    }
    appendFileSync(ERROR_LOG_PATH, entry + '\n', 'utf-8');
  } catch {
    // Last resort — can't log the logging failure
  }
}

function readErrorLog(): string {
  try {
    if (existsSync(ERROR_LOG_PATH)) {
      return readFileSync(ERROR_LOG_PATH, 'utf-8');
    }
  } catch { /* ignore */ }
  return '';
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

ipcMain.handle('storage:batchWrite', (_event, entries: { filename: string; data: unknown }[]) => {
  const config = readConfig();
  if (!config) return { success: false, error: 'No config' };

  if (!existsSync(config.storagePath)) {
    mkdirSync(config.storagePath, { recursive: true });
  }

  const tmpPaths: string[] = [];
  const finalPaths: string[] = [];

  // Phase 1: Write all files to .tmp
  try {
    for (const entry of entries) {
      const finalPath = join(config.storagePath, entry.filename);
      const tmpPath = finalPath + '.tmp';
      writeFileSync(tmpPath, JSON.stringify(entry.data, null, 2), 'utf-8');
      tmpPaths.push(tmpPath);
      finalPaths.push(finalPath);
    }
  } catch (err) {
    // Clean up any .tmp files written so far
    for (const tmp of tmpPaths) {
      try { unlinkSync(tmp); } catch { /* ignore */ }
    }
    return { success: false, error: `Failed to write temp files: ${err}` };
  }

  // Phase 2: Rename all .tmp to final (atomic per-file on most filesystems)
  const renamedCount: number[] = [];
  try {
    for (let i = 0; i < tmpPaths.length; i++) {
      renameSync(tmpPaths[i], finalPaths[i]);
      renamedCount.push(i);
    }
  } catch (err) {
    // Partial rename failure — this is the worst case but extremely unlikely
    // since rename is same-directory. Clean up remaining .tmp files.
    for (let i = renamedCount.length; i < tmpPaths.length; i++) {
      try { unlinkSync(tmpPaths[i]); } catch { /* ignore */ }
    }
    return { success: false, error: `Partial rename failure: ${err}` };
  }

  // Phase 3: Update timestamps for all written files
  const timestamps: Record<string, number> = {};
  for (let i = 0; i < entries.length; i++) {
    try {
      const stats = statSync(finalPaths[i]);
      timestamps[entries[i].filename] = stats.mtimeMs;
    } catch { /* ignore */ }
  }

  return { success: true, timestamps };
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

ipcMain.handle('storage:readDefaults', () => {
  // In dev: resources/ is in the project root; in prod: process.resourcesPath
  const devPath = join(__dirname, '../../resources/defaults.csv');
  const prodPath = join(process.resourcesPath, 'defaults.csv');
  const csvPath = existsSync(devPath) ? devPath : prodPath;
  try {
    return readFileSync(csvPath, 'utf-8');
  } catch {
    return '';
  }
});

ipcMain.handle('error:log', (_event, entry: { message: string; context?: string; stack?: string }) => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${entry.message}${entry.context ? ` | ctx: ${entry.context}` : ''}${entry.stack ? `\n  ${entry.stack}` : ''}`;
  appendErrorLog(line);
  return true;
});

ipcMain.handle('error:getLog', () => {
  return readErrorLog();
});

ipcMain.handle('error:getLogPath', () => {
  return ERROR_LOG_PATH;
});

ipcMain.handle('error:sendReport', async (_event, body: string) => {
  const subject = encodeURIComponent('Course Schedule Visualizer — Error Report');
  const encodedBody = encodeURIComponent(body);
  // mailto URIs have a practical limit (~2000 chars in some clients)
  // Truncate body if needed to stay safe
  const maxLen = 1800;
  const safeBody = encodedBody.length > maxLen ? encodedBody.slice(0, maxLen) + encodeURIComponent('\n\n[truncated — see attached log file]') : encodedBody;
  const url = `mailto:gmsschlitt@gmail.com?subject=${subject}&body=${safeBody}`;
  await shell.openExternal(url);
  return true;
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
