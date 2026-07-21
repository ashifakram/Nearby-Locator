import Joi from 'joi';

const isTest = process.env.NODE_ENV === 'test';

export const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'staging', 'test')
    .default('development'),
  PORT: Joi.number().port().default(5000),
  HOST: Joi.string().default('0.0.0.0'), // Docker/container-safe default binding
  APP_VERSION: Joi.string().default('1.0.0'), // Centralized app version parameter

  // Database configurations
  DATABASE_URL: isTest 
    ? Joi.string().uri().default('postgresql://postgres:postgres@localhost:5432/nearby_locator_test')
    : Joi.string().uri().required(),
  DATABASE_POOL_MIN: Joi.number().integer().min(0).default(2),
  DATABASE_POOL_MAX: Joi.number().integer().min(Joi.ref('DATABASE_POOL_MIN')).default(10),
  DATABASE_SSL: Joi.boolean().truthy('true', '1', true).falsy('false', '0', false).default(false),

  // Redis configurations
  REDIS_URL: isTest
    ? Joi.string().uri().default('redis://localhost:6379/1') // Isolated DB index 1 for test runs
    : Joi.string().uri().required(),
  REDIS_PREFIX: Joi.string().default('nearby-locator:'),
  REDIS_TLS: Joi.boolean().truthy('true', '1', true).falsy('false', '0', false).default(false),

  // Authentication credentials
  JWT_SECRET: isTest
    ? Joi.string().default('test_jwt_secret_must_be_minimum_32_characters_long_for_aes')
    : Joi.string().min(32).required(),
  JWT_EXPIRY: Joi.string().regex(/^\d+[smhd]$/).default('7d'), // Validates formats like 30m, 24h, 7d
  BCRYPT_COST: Joi.number().integer().min(10).max(14).default(12), // Tunable per deployment; min 10 for security
  PASSWORD_RESET_EXPIRY_MS: Joi.number().integer().min(300000).default(3600000), // Default 1 hour; min 5 minutes

  // Integrations & Services (decoupled from Telemetry)
  GOOGLE_API_KEY: isTest ? Joi.string().default('mock_google_api_key') : Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),

  // Telemetry (Strictly limits to logging, monitoring, and tracing settings)
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  MOCK_GEO_IP: Joi.boolean().truthy('true', '1', true).falsy('false', '0', false).default(true),
  HEALTH_TIMEOUT_MS: Joi.number().integer().min(100).default(2000), // Centralized health checks timeout
  SLOW_QUERY_THRESHOLD_MS: Joi.number().integer().min(1).default(250), // Slow query threshold in milliseconds
})
.unknown(true); // allow unknown environment variables to pass through

