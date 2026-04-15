import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { StorageAdapter } from './StorageAdapter';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export class FileStorage implements StorageAdapter {
  private async ensureDir(): Promise<void> {
    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
    }
  }

  async save(file: Buffer, path: string): Promise<string> {
    await this.ensureDir();
    const fullPath = join(UPLOADS_DIR, path);
    await writeFile(fullPath, file);
    return fullPath;
  }

  async load(path: string): Promise<Buffer> {
    const fullPath = join(UPLOADS_DIR, path);
    return readFile(fullPath);
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(UPLOADS_DIR, path);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  }
}
