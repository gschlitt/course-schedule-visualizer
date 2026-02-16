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
  selectCsvFolder(): Promise<string | null>;
  writeCsv(folderPath: string, filename: string, csvContent: string): Promise<boolean>;
}

interface Window {
  storageApi: StorageApi;
}
