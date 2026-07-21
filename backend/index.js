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


const app = express();
app.disable('x-powered-by');
app.use(express.json());

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
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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

// In-memory storage for lists (in production, use a database like Redis or MongoDB)
const lists = new Map(); // Map<listName, Array<{place_id, name, address, rating, map_url}>>

const categories = {
    restaurant: "restaurant",
    hospital: "hospital",
    medical: "pharmacy",
    pharmacy: "pharmacy",
    gas_station: "gas_station",
    atm: "atm",
    school: "school",
    shopping_mall: "shopping_mall",
    bank: "bank",
    cafe: "cafe",
    lodging: "lodging"
};

app.post("/nearby", async (req, res) => {
    console.log("\n========================================");
    console.log("📍 NEW REQUEST RECEIVED");
    console.log("========================================");
    console.log("⏰ Timestamp:", new Date().toLocaleString());

    try {
        const { latitude, longitude, category, radius, keyword, opennow } = req.body;

        console.log("\n📥 Request Body:");
        console.log("  - Latitude:", latitude);
        console.log("  - Longitude:", longitude);
        console.log("  - Category:", category);
        console.log("  - Radius:", radius, "km");
        console.log("  - Keyword:", keyword || "none");
        console.log("  - Open Now:", opennow || false);

        const placeType = categories[category] || "restaurant";
        console.log("\n🏷️  Mapped Place Type:", placeType);

        console.log("\n🌐 Making API Request to Google Places...");
        const apiUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
        console.log("  - URL:", apiUrl);
        console.log("  - Location:", `${latitude},${longitude}`);
        console.log("  - Radius:", radius * 1000, "meters");
        console.log("  - Type:", placeType);
        console.log("  - Keyword:", keyword || "none");
        console.log("  - Open Now:", opennow || false);
        console.log("  - API Key:", config.services.googleApiKey ? "✓ Present" : "✗ Missing");

        const response = await axios.get(apiUrl, {
            params: {
                location: `${latitude},${longitude}`,
                radius: radius * 1000,
                type: placeType,
                key: config.services.googleApiKey,
                ...(keyword && { keyword }),
                ...(opennow && { opennow: true }),
            },
        });

        console.log("\n✅ Google API Response Status:", response.data.status);
        console.log("📊 Total Results Found:", response.data.results?.length || 0);

        // Handle Google API errors (anything other than OK or ZERO_RESULTS)
        if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
            console.log("⚠️  API Error:", response.data.status);
            if (response.data.error_message) {
                console.log("❌ Error Message:", response.data.error_message);
            }
            
            let errorMessage = "";
            switch (response.data.status) {
                case "REQUEST_DENIED":
                    errorMessage = "🔒 Our location service is currently unavailable. We're working to fix this. Please try again later.";
                    break;
                case "INVALID_REQUEST":
                    errorMessage = "😕 Something went wrong with your search. Please try again with a different location or category.";
                    break;
                case "OVER_QUERY_LIMIT":
                    errorMessage = "⏳ We're experiencing high traffic right now. Please wait a moment and try your search again.";
                    break;
                case "UNKNOWN_ERROR":
                    errorMessage = "😕 Something unexpected happened. Please try your search again.";
                    break;
                default:
                    errorMessage = "😕 We're having trouble finding places right now. Please try again in a moment.";
            }
            
            console.log("========================================\n");
            return res.json({ status: "error", message: errorMessage });
        }

        // Check if results array exists and has data
        if (!response.data.results || response.data.results.length === 0) {
            console.log("\n📭 No results found");
            console.log("========================================\n");
            return res.json({ status: "success", results: [] });
        }

        const results = response.data.results.map((place, index) => {
            const lat = place.geometry.location.lat;
            const lng = place.geometry.location.lng;

            console.log(`\n  ${index + 1}. ${place.name}`);
            console.log(`     📍 ${place.vicinity}`);
            console.log(`     ⭐ Rating: ${place.rating || "N/A"}`);

            return {
                name: place.name,
                address: place.vicinity,
                rating: place.rating,
                place_id: place.place_id, // Add place_id for list functionality
                map_url: `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${lat},${lng}`
            };
        });

        console.log("\n✅ SUCCESS - Sending", results.length, "results to frontend");
        console.log("========================================\n");

        res.json({ status: "success", results });

    } catch (error) {
        console.log("\n❌ ERROR OCCURRED:");
        console.log("  - Message:", error.message);
        console.log("  - Stack:", error.stack);
        
        if (error.response) {
            console.log("\n🔴 API Response Error:");
            console.log("  - Status:", error.response.status);
            console.log("  - Data:", JSON.stringify(error.response.data, null, 2));
        }
        
        console.log("========================================\n");
        
        // Send user-friendly error message
        res.json({ 
            status: "error", 
            message: "😕 We're having trouble connecting to our location service right now. Please try again in a few moments." 
        });
    }
});

// Health check endpoint for Docker
app.get("/health", (req, res) => {
  // Use standardized response
  res.success({ status: "healthy", timestamp: new Date().toISOString() }, "Server healthy", 200);
});

// Lists endpoints for saving and managing places
app.get("/lists", (req, res) => {
    const listNames = Array.from(lists.keys());
    res.json({ status: "success", lists: listNames });
});

app.post("/lists", (req, res) => {
    try {
        const { listName, place } = req.body;

        if (!listName || !place) {
            return res.json({
                status: "error",
                message: "List name and place are required"
            });
        }

        // Initialize list if it doesn't exist
        if (!lists.has(listName)) {
            lists.set(listName, []);
        }

        // Check if place already exists in list (by place_id)
        const list = lists.get(listName);
        const exists = list.some(p => p.place_id === place.place_id);

        if (exists) {
            return res.json({
                status: "error",
                message: "This place is already in the list"
            });
        }

        // Add place to list
        list.push({
            place_id: place.place_id,
            name: place.name,
            address: place.address,
            rating: place.rating,
            map_url: place.map_url
        });

        res.json({
            status: "success",
            message: `Place added to ${listName}`,
            list: list
        });
    } catch (error) {
        console.error("Error adding to list:", error);
        res.json({
            status: "error",
            message: "Failed to add place to list"
        });
    }
});

app.get("/lists/:listName", (req, res) => {
    try {
        const { listName } = req.params;
        const list = lists.get(listName) || [];
        res.json({ status: "success", list });
    } catch (error) {
        console.error("Error fetching list:", error);
        res.json({
            status: "error",
            message: "Failed to fetch list"
        });
    }
});

app.delete("/lists/:listName", (req, res) => {
    try {
        const { listName } = req.params;
        if (lists.delete(listName)) {
            res.json({
                status: "success",
                message: `List ${listName} deleted`
            });
        } else {
            res.json({
                status: "error",
                message: "List not found"
            });
        }
    } catch (error) {
        console.error("Error deleting list:", error);
        res.json({
            status: "error",
            message: "Failed to delete list"
        });
    }
});

app.delete("/lists/:listName/place/:placeId", (req, res) => {
    try {
        const { listName, placeId } = req.params;
        const list = lists.get(listName);

        if (!list) {
            return res.json({
                status: "error",
                message: "List not found"
            });
        }

        const initialLength = list.length;
        const filteredList = list.filter(place => place.place_id !== placeId);
        lists.set(listName, filteredList);

        if (filteredList.length < initialLength) {
            res.json({
                status: "success",
                message: "Place removed from list",
                list: filteredList
            });
        } else {
            res.json({
                status: "error",
                message: "Place not found in list"
            });
        }
    } catch (error) {
        console.error("Error removing place from list:", error);
        res.json({
            status: "error",
            message: "Failed to remove place from list"
        });
    }
});

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