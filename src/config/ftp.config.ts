import { registerAs } from '@nestjs/config';

export default registerAs('ftp', () => ({
  host: process.env.FTP_HOST || '',
  user: process.env.FTP_USER || '',
  password: process.env.FTP_PASSWORD || '',
  port: parseInt(process.env.FTP_PORT || '21', 10),
  secure: process.env.FTP_SECURE === 'true',
}));
