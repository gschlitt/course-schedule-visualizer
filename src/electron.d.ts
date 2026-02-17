interface StorageApi {
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
  batchWrite(entries: { filename: string; data: unknown }[]): Promise<{
    success: boolean;
    error?: string;
    timestamps?: Record<string, number>;
  }>;
  logError(entry: { message: string; context?: string; stack?: string }): Promise<boolean>;
  getErrorLog(): Promise<string>;
  getErrorLogPath(): Promise<string>;
  sendErrorReport(body: string): Promise<boolean>;
  selectCsvFolder(): Promise<string | null>;
  writeCsv(folderPath: string, filename: string, csvContent: string): Promise<boolean>;
  readDefaults(): Promise<string>;
}

interface Window {
  storageApi: StorageApi;
}
