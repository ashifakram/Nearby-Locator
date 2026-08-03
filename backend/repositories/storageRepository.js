import fs from 'fs';
import path from 'path';

class StorageRepository {
  _getDirectorySize(dirPath) {
    let totalSize = 0;
    if (!fs.existsSync(dirPath)) return 0;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          totalSize += this._getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      } catch {
        // Skip unreadable files
      }
    }
    return totalSize;
  }

  async getStorageStats() {
    const baseUploadsDir = path.resolve(process.cwd(), 'uploads');
    const avatarDir = path.join(baseUploadsDir, 'avatars');
    const exportsDir = path.join(baseUploadsDir, 'exports');

    const avatarSizeBytes = this._getDirectorySize(avatarDir);
    const exportsSizeBytes = this._getDirectorySize(exportsDir);
    const totalSizeBytes = this._getDirectorySize(baseUploadsDir);

    return {
      avatarSizeMb: parseFloat((avatarSizeBytes / (1024 * 1024)).toFixed(2)),
      exportsSizeMb: parseFloat((exportsSizeBytes / (1024 * 1024)).toFixed(2)),
      totalSizeMb: parseFloat((totalSizeBytes / (1024 * 1024)).toFixed(2))
    };
  }
}

export default new StorageRepository();
