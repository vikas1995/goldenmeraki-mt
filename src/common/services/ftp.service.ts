import * as ftp from 'basic-ftp';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class FtpService {
  private readonly logger = new Logger(FtpService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadFile(fileBuffer: Buffer, remoteFilePath: string): Promise<boolean> {
    const host = this.configService.get<string>('ftp.host');
    const user = this.configService.get<string>('ftp.user');
    const password = this.configService.get<string>('ftp.password');
    const port = this.configService.get<number>('ftp.port') || 21;
    const secure = this.configService.get<boolean>('ftp.secure') || false;

    if (!host || !user || !password) {
      this.logger.warn('FTP credentials are not configured. Skipping FTP upload.');
      return false;
    }

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      this.logger.log(`Connecting to FTP host ${host}...`);
      await client.access({
        host,
        user,
        password,
        port,
        secure,
        // Hostinger FTP often requires passive mode or secure settings
      });

      this.logger.log(`Connected to FTP! Uploading to path: ${remoteFilePath}`);
      
      // Ensure target directory exists
      const lastSlash = remoteFilePath.lastIndexOf('/');
      if (lastSlash !== -1) {
        const remoteDir = remoteFilePath.substring(0, lastSlash);
        await client.ensureDir(remoteDir);
      }
      
      const stream = Readable.from(fileBuffer);
      await client.uploadFrom(stream, remoteFilePath);
      
      this.logger.log(`Successfully uploaded file via FTP to ${remoteFilePath}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to upload file via FTP to ${remoteFilePath}: ${err.message}`, err.stack);
      throw err;
    } finally {
      client.close();
    }
  }

  async deleteFile(remoteFilePath: string): Promise<boolean> {
    const host = this.configService.get<string>('ftp.host');
    const user = this.configService.get<string>('ftp.user');
    const password = this.configService.get<string>('ftp.password');
    const port = this.configService.get<number>('ftp.port') || 21;
    const secure = this.configService.get<boolean>('ftp.secure') || false;

    if (!host || !user || !password) {
      return false;
    }

    const client = new ftp.Client();
    try {
      await client.access({
        host,
        user,
        password,
        port,
        secure,
      });

      this.logger.log(`FTP deleting file: ${remoteFilePath}`);
      await client.remove(remoteFilePath);
      this.logger.log(`Successfully deleted file via FTP: ${remoteFilePath}`);
      return true;
    } catch (err) {
      this.logger.warn(`Failed to delete file via FTP ${remoteFilePath}: ${err.message}`);
      return false;
    } finally {
      client.close();
    }
  }
}
