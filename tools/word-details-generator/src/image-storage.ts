import * as fs from 'fs-extra';
import * as path from 'path';
import { put } from '@vercel/blob';

export class ImageStorage {
  private outputDir: string;
  private useVercelStorage: boolean;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.useVercelStorage = !!process.env.BLOB_READ_WRITE_TOKEN;
    this.ensureOutputDir();
  }

  async uploadImage(imageBuffer: Buffer, word: string): Promise<string> {
    const timestamp = this.generateTimestamp();
    const fileName = `${word.toLowerCase()}-${timestamp}.png`;
    
    if (this.useVercelStorage) {
      return await this.uploadToVercel(imageBuffer, fileName);
    } else {
      return await this.saveLocally(imageBuffer, fileName);
    }
  }

  private async uploadToVercel(imageBuffer: Buffer, fileName: string): Promise<string> {
    try {
      console.log(`☁️ Uploading ${fileName} to Vercel Blob storage...`);
      
      // Convert Buffer to ArrayBuffer for Vercel Blob
      const arrayBuffer = imageBuffer.buffer.slice(
        imageBuffer.byteOffset,
        imageBuffer.byteOffset + imageBuffer.byteLength
      ) as ArrayBuffer;
      
      const blob = await put(fileName, arrayBuffer, {
        access: 'public',
        contentType: 'image/png',
      });
      
      console.log(`✅ Successfully uploaded to: ${blob.url}`);
      return blob.url;
    } catch (error) {
      console.error('❌ Error uploading to Vercel:', error);
      // Fallback to local storage
      console.log('🔄 Falling back to local storage...');
      return await this.saveLocally(imageBuffer, fileName);
    }
  }

  private async saveLocally(imageBuffer: Buffer, fileName: string): Promise<string> {
    const filePath = path.join(this.outputDir, 'images', fileName);
    
    // Ensure images directory exists
    await fs.ensureDir(path.dirname(filePath));
    
    // Write image buffer to file
    await fs.writeFile(filePath, imageBuffer);
    
    console.log(`💾 Image saved locally to: ${filePath}`);
    return filePath;
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
  }

  private async ensureOutputDir(): Promise<void> {
    await fs.ensureDir(this.outputDir);
    await fs.ensureDir(path.join(this.outputDir, 'images'));
  }
}
