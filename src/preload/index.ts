import { contextBridge, ipcRenderer } from 'electron';

export interface StorageApi {
  getConfig(): Promise<{ storagePath: string } | null>;
  selectFolder(): Promise<{ storagePath: string } | null>;
  changeFolder(): Promise<{ storagePath: string } | null>;
  read(filename: string): Promise<{ data: unknown; lastModified: number }>;
  write(filename: string, req: { data: unknown; expectedLastModified: number }): Promise<{
    success: boolean;
    conflict: boolean;
    lastModified: number;
    currentData?: unknown;
  }>;
  selectCsvFolder(): Promise<string | null>;
  writeCsv(folderPath: string, filename: string, csvContent: string): Promise<boolean>;
}

const storageApi: StorageApi = {
  getConfig: () => ipcRenderer.invoke('storage:getConfig'),
  selectFolder: () => ipcRenderer.invoke('storage:selectFolder'),
  changeFolder: () => ipcRenderer.invoke('storage:changeFolder'),
  read: (filename) => ipcRenderer.invoke('storage:read', filename),
  write: (filename, req) => ipcRenderer.invoke('storage:write', filename, req),
  selectCsvFolder: () => ipcRenderer.invoke('storage:selectCsvFolder'),
  writeCsv: (folderPath, filename, csvContent) => ipcRenderer.invoke('storage:writeCsv', folderPath, filename, csvContent),
};

contextBridge.exposeInMainWorld('storageApi', storageApi);
