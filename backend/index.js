import express from "express";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import { execSync } from "child_process";
import swaggerUi from "swagger-ui-express";

// Initialize and validate operational configurations at startup
let config;
try {
  const configModule = await import('./config/index.js');
  config = configModule.default;

  if (config.app.env === 'production') {
    console.log(`\n🩺 [Config Diagnostics] Initialized: ENV=${config.app.env} | PORT=${config.app.port} | HOST=${config.app.host} | DB=Configured | Redis=Configured | Services=Active`);
  } else if (config.app.env !== 'test') {
    const { redactSecrets } = await import('./config/loader.js');
    const safeMetadata = redactSecrets(config);
    console.log('\n🩺 [Config Diagnostics] Initialized Successfully:', JSON.stringify(safeMetadata, null, 2));
  }
} catch (error) {
  if (error.name === 'ConfigValidationError') {
    console.error('\n🚨 ========================================');
    console.error('🚨 CONFIGURATION SCHEMA VALIDATION CRITICAL ERROR');
    console.error('🚨 ---------------------------------------');
    console.error(`🚨 Message: ${error.message}`);
    console.error('🚨 ========================================\n');
    process.exit(1);
  }
  throw error;
}


import { correlationIdMiddleware } from './middleware/correlationId.js';

const app = express();
app.disable('x-powered-by');
app.use(correlationIdMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// Native zero-dependency lightweight HTTP-only cookie parser middleware
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie;
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const value = (parts[1] || '').trim();
      cookies[name] = decodeURIComponent(value);
    });
  }
  req.cookies = cookies;
  next();
});

import { responseFormatter } from './middleware/responseFormatter.js';
app.use(responseFormatter);

import { requestObservability } from './middleware/observability.js';
app.use(requestObservability);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true
}));

export default app;

// Import routers
import healthRouter from './routes/healthRoutes.js';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import spotRouter from './routes/spotRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';
import discoveryRouter from './routes/discoveryRoutes.js';
import moderationRouter from './routes/moderationRoutes.js';
import { authJwt } from './middleware/authJwt.js';
import { requirePermission } from './middleware/requirePermission.js';
import { analyticsTracker } from './middleware/analyticsTracker.js';
import { getAnalyticsDashboard } from './controllers/analyticsController.js';

// Mount API routers
import { register } from './utils/metrics.js';

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/spots', spotRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/moderation', moderationRouter);

// Admin analytics dashboard — layered access: JWT + requirePermission + loopback/token (in controller)
app.get('/api/admin/analytics/dashboard', authJwt, requirePermission('metrics.read'), getAnalyticsDashboard);

// Swagger OpenAPI Documentation Configuration
const bundledDocsPath = './dist/openapi.bundled.json';

if (!fs.existsSync(bundledDocsPath)) {
  if (config.app.env === 'production') {
    throw new Error('FATAL: OpenAPI bundled artifact is missing. Run `npm run docs:bundle` before starting the server.');
  } else {
    console.log('🏗️ Building local OpenAPI bundle...');
    execSync('npm run docs:bundle', { stdio: 'inherit' });
  }
}

const swaggerDocument = JSON.parse(fs.readFileSync(bundledDocsPath, 'utf8'));
// Dynamically inject the active server environment
swaggerDocument.servers = [
  { url: config.app.apiUrl || `http://localhost:${config.app.port}/api`, description: 'Current Environment Server' }
];

const docsMiddleware = config.app.env === 'production'
  ? [authJwt, requirePermission('docs.read'), swaggerUi.serve, swaggerUi.setup(swaggerDocument)]
  : [swaggerUi.serve, swaggerUi.setup(swaggerDocument)];

app.use('/api-docs/v1', ...docsMiddleware);

// Global error handler (must be last)
import { errorHandler } from './middleware/errorHandler.js';
app.use(errorHandler);



if (config.app.env !== 'test' && process.env.NO_LISTEN !== 'true') {
  let activeWorker = null;
  let activeScheduler = null;

  const server = app.listen(config.app.port, config.app.host, async () => {
    console.log(`📡 Server running on: http://${config.app.host}:${config.app.port}`);

    // Bootstrap Background Worker if enabled via environment flag
    if (process.env.RUN_WORKER === 'true') {
      try {
        const { Worker } = await import('./utils/queue.js');
        const { jobRegistry } = await import('./jobs/index.js');
        activeWorker = new Worker(jobRegistry);
        await activeWorker.start();
        console.log('👷 Background Worker started successfully.');
      } catch (workerErr) {
        console.error('Failed to start Background Worker:', workerErr);
      }
    }

    // Bootstrap Cron Scheduler if enabled via environment flag
    if (process.env.RUN_SCHEDULER === 'true') {
      try {
        const { Scheduler } = await import('./utils/queue.js');
        activeScheduler = new Scheduler();
        activeScheduler.start();
        console.log('⏰ Scheduled Jobs Scheduler started successfully.');
      } catch (schedErr) {
        console.error('Failed to start Scheduler:', schedErr);
      }
    }
  });

  const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      console.log('📡 HTTP server closed. Draining operational resources...');

      // Gracefully drain worker tasks and disconnect blocking connections first
      if (activeWorker) {
        try {
          console.log('👷 Shutting down active Background Worker...');
          await activeWorker.shutdown();
        } catch (workerCloseErr) {
          console.error('Error closing Background Worker during shutdown:', workerCloseErr);
        }
      }

      // Shut down periodic scheduler sweep timers
      if (activeScheduler) {
        try {
          console.log('⏰ Shutting down Scheduled Jobs Scheduler...');
          activeScheduler.shutdown();
        } catch (schedCloseErr) {
          console.error('Error closing Scheduler during shutdown:', schedCloseErr);
        }
      }

      try {
        const { closeRateLimiter } = await import('./middleware/rateLimiter.js');
        closeRateLimiter();
        console.log('🧹 Rate limiter maintenance timers cleared.');
      } catch (err) {
        console.error('Error clearing rate limiter intervals during shutdown:', err);
      }

      try {
        const { closeDatabase } = await import('./db.js');
        await closeDatabase();
      } catch (err) {
        console.error('Error destroying Knex pool during shutdown:', err);
      }

      try {
        const client = (await import('./redisClient.js')).default;
        if (client && client.isOpen) {
          console.log('🔌 Closing Redis connection...');
          await client.quit();
          console.log('✅ Redis connection closed.');
        }
      } catch (err) {
        console.error('Error closing Redis connection during shutdown:', err);
      }

      console.log('👋 Process terminated cleanly.');
      process.exit(0);
    });

    // Enforce a maximum timeout to prevent process hangs
    setTimeout(() => {
      console.error('🚨 Graceful shutdown timed out! Forcing exit.');
      process.exit(1);
    }, 12000); // 12 seconds to ensure worker has enough time to drain active tasks (5s)
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}