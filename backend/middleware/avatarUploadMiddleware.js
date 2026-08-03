import { AvatarStorageService } from '../services/avatarStorageService.js';
import { ValidationError } from '../utils/errors.js';

/**
 * AvatarUploadMiddleware: Express middleware for handling avatar image input.
 * Supports base64 JSON (`req.body.avatar_base64` or `req.body.dataUri`) or raw binary body.
 */
export const avatarUploadMiddleware = (req, res, next) => {
  try {
    if (req.body && (req.body.avatar_base64 || req.body.dataUri)) {
      const dataUri = req.body.avatar_base64 || req.body.dataUri;
      const { buffer, mimeType } = AvatarStorageService.parseBase64(dataUri);
      req.avatarBuffer = buffer;
      req.avatarMimeType = mimeType;
      return next();
    }

    if (req.file && req.file.buffer) {
      req.avatarBuffer = req.file.buffer;
      req.avatarMimeType = req.file.mimetype;
      return next();
    }

    if (Buffer.isBuffer(req.body)) {
      req.avatarBuffer = req.body;
      req.avatarMimeType = req.headers['content-type'];
      return next();
    }

    throw new ValidationError('No avatar image payload provided. Please send avatar_base64 data URI or image file.');
  } catch (err) {
    next(err);
  }
};
