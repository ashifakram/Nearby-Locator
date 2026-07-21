import { correlationStore, logger, pinoInstance } from '../utils/logger.js';
import { httpRequestDurationSeconds } from '../utils/metrics.js';
import crypto from 'crypto';
import pinoHttp from 'pino-http';

let consecutiveFailedHealthChecks = 0;

export const requestObservability = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', requestId);
  
  const startTime = process.hrtime();
  
  // Set up context store with minimal fields (no large request/response objects stored)
  const store = { requestId, userId: null };
  
  correlationStore.run(store, () => {
    res.on('finish', () => {
      // Prometheus metric collection
      const diff = process.hrtime(startTime);
      const durationSeconds = diff[0] + diff[1] / 1e9;
      
      const isHealthPath = req.originalUrl === '/health' || req.originalUrl === '/health/readiness' || req.originalUrl === '/health/liveness';
      const isFailure = res.statusCode >= 500;
      
      if (isHealthPath) {
        if (isFailure) {
          consecutiveFailedHealthChecks++;
          if (consecutiveFailedHealthChecks === 1 || consecutiveFailedHealthChecks % 10 === 0) {
            logger.warn('HEALTH_FAILURE', 'Failing health check telemetry block', {
              method: req.method,
              url: req.originalUrl,
              status: res.statusCode,
              consecutiveFailures: consecutiveFailedHealthChecks
            });
          }
        } else {
          consecutiveFailedHealthChecks = 0;
        }
        return; // Exclude health checks from HTTP latency Prometheus histograms to prevent skew
      }

      // Record to Prometheus
      let cleanUrl = req.originalUrl || '';
      if (cleanUrl.includes('?')) cleanUrl = cleanUrl.split('?')[0] + '?[REDACTED]';
      
      httpRequestDurationSeconds.labels(req.method, req.route ? req.route.path : 'unknown', res.statusCode).observe(durationSeconds);

      logger.info('request_complete', {
        method: req.method,
        url: cleanUrl,
        status: res.statusCode,
        durationMs: (durationSeconds * 1000).toFixed(2),
        ip: req.ip,
        userAgent: (req.headers['user-agent'] || '').substring(0, 255)
      }, 'HTTP');
    });
    
    next();
  });
};

export const bindUserToCorrelation = (req, res, next) => {
  const store = correlationStore.getStore();
  if (store && req.user && req.user.id) {
    store.userId = req.user.id;
  }
  next();
};
