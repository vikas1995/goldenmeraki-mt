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

/**
 * Validate a video file upload.
 * Allowed formats: MP4, WebM.
 * Max size: 50 MB (configurable).
 */
export function validateVideoFile(file: Express.Multer.File, maxSizeInBytes: number = 50 * 1024 * 1024) {
  if (!file || !file.buffer) {
    throw new BadRequestException('No video file uploaded or file buffer is empty');
  }

  // 1. Check size limit
  if (file.size > maxSizeInBytes) {
    const maxMB = Math.round(maxSizeInBytes / (1024 * 1024));
    throw new BadRequestException(`Video file size exceeds the ${maxMB}MB limit. Uploaded size: ${Math.round(file.size / (1024 * 1024))}MB`);
  }

  // 2. Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.mp4', '.webm'];
  if (!allowedExtensions.includes(ext)) {
    throw new BadRequestException('Invalid video file extension. Only .mp4 and .webm are allowed.');
  }

  // 3. Verify magic bytes
  const buffer = file.buffer;
  if (buffer.length < 12) {
    throw new BadRequestException('File is too small to be a valid video');
  }

  let isValid = false;

  // MP4 magic: bytes 4-7 should be 'ftyp' (66 74 79 70)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    isValid = true;
  }
  // WebM magic: starts with 1A 45 DF A3 (EBML header)
  else if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    isValid = true;
  }

  if (!isValid) {
    throw new BadRequestException('Invalid video file content. File format does not match allowed video types (mp4, webm).');
  }
}
