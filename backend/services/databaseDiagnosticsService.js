import healthRepository from '../repositories/healthRepository.js';
import slowQueryLogRepository from '../repositories/slowQueryLogRepository.js';
import storageRepository from '../repositories/storageRepository.js';

class DatabaseDiagnosticsService {
  async getInfrastructureHealth() {
    const [pgStats, storageStats] = await Promise.all([
      healthRepository.getPostgresStats(),
      storageRepository.getStorageStats()
    ]);

    return {
      postgres: pgStats,
      storage: storageStats,
      memory: {
        rssMb: parseFloat((process.memoryUsage().rss / (1024 * 1024)).toFixed(2)),
        heapTotalMb: parseFloat((process.memoryUsage().heapTotal / (1024 * 1024)).toFixed(2)),
        heapUsedMb: parseFloat((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2))
      }
    };
  }

  async getSlowQueries(query) {
    return await slowQueryLogRepository.getSlowQueries(query);
  }
}

export default new DatabaseDiagnosticsService();
