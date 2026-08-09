import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export function validateImageFile(file: Express.Multer.File, maxSizeInBytes: number = 10 * 1024 * 1024) {
  if (!file || !file.buffer) {
    throw new BadRequestException('No file uploaded or file buffer is empty');
  }

  // 1. Check size limit
  if (file.size > maxSizeInBytes) {
    throw new BadRequestException('File size exceeds the 10MB limit');
  }

  // 2. Check extension suffix
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  if (!allowedExtensions.includes(ext)) {
    throw new BadRequestException('Invalid file extension. Only jpg, jpeg, png, and webp are allowed.');
  }

  // 3. Verify magic bytes (signature) to ensure we do not trust client MIME type or extension
  const buffer = file.buffer;
  if (buffer.length < 4) {
    throw new BadRequestException('File is too small to be a valid image');
  }

  let isValid = false;

  // PNG magic number: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    isValid = true;
  }
  // JPEG magic number: FF D8 FF
  else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    isValid = true;
  }
  // WEBP magic number: RIFF .... WEBP
  else if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // 'RIFF'
    buffer.length >= 12 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50 // 'WEBP'
  ) {
    isValid = true;
  }

  if (!isValid) {
    throw new BadRequestException('Invalid file content. File format does not match allowed image types (jpg, jpeg, png, webp).');
  }
}
