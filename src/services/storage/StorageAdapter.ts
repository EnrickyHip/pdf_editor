export interface StorageAdapter {
  save(file: Buffer, path: string): Promise<string>;
  load(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
}
