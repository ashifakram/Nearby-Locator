import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../utils/errors.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure uploads directory exists on module load
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * AvatarStorageService: Handles validation, storage, replacement, and deletion of avatar image files.
 * Enforces magic-byte signature checking and strict size limits.
 */
export const AvatarStorageService = {
  /**
   * Validates raw file buffer or base64 input against magic bytes header and MIME specifications.
   */
  validateAvatarBuffer(buffer, mimeType) {
    if (!buffer || !(buffer instanceof Buffer)) {
      throw new ValidationError('Invalid or missing image buffer.');
    }
    if (buffer.length > MAX_FILE_SIZE) {
      throw new ValidationError('Avatar file size exceeds the 5MB maximum limit.');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (mimeType && !allowedMimeTypes.includes(mimeType.toLowerCase())) {
      throw new ValidationError('Unsupported image MIME type. Only JPEG, PNG, and WEBP are permitted.');
    }

    // Verify magic bytes signature
    const header = buffer.toString('hex', 0, 4).toUpperCase();
    const isJpeg = header.startsWith('FFD8FF');
    const isPng = header === '89504E47';
    const isWebp = buffer.toString('utf8', 8, 12) === 'WEBP';

    if (!isJpeg && !isPng && !isWebp) {
      throw new ValidationError('File signature verification failed. Image file is corrupt or altered.');
    }

    let ext = 'jpg';
    if (isPng) ext = 'png';
    if (isWebp) ext = 'webp';

    return { ext, isJpeg, isPng, isWebp };
  },

  /**
   * Parses base64 data URI string into buffer and MIME type.
   */
  parseBase64(dataUri) {
    if (typeof dataUri !== 'string') {
      throw new ValidationError('Invalid base64 payload format.');
    }
    const matches = dataUri.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new ValidationError('Malformed base64 image data URI format.');
    }
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    return { buffer, mimeType };
  },

  /**
   * Saves image buffer to disk securely and returns relative URL path.
   */
  async saveAvatarBuffer(buffer, mimeType) {
    const { ext } = this.validateAvatarBuffer(buffer, mimeType);
    const filename = `${uuidv4()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.promises.writeFile(filePath, buffer);
    return `/uploads/avatars/${filename}`;
  },

  /**
   * Saves base64 avatar image string.
   */
  async saveBase64Avatar(dataUri) {
    const { buffer, mimeType } = this.parseBase64(dataUri);
    return this.saveAvatarBuffer(buffer, mimeType);
  },

  /**
   * Deletes an existing local avatar file by URL path.
   */
  async deleteAvatarFile(avatarUrl) {
    if (!avatarUrl || typeof avatarUrl !== 'string') return;
    if (!avatarUrl.startsWith('/uploads/avatars/')) return; // Ignore external URLs (e.g. Google avatar)

    const filename = path.basename(avatarUrl);
    const filePath = path.join(UPLOAD_DIR, filename);

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (e) {
      // Non-blocking cleanup failure log
    }
  }
};
