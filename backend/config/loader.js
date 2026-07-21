import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { configSchema } from './schema.js';
import { ConfigValidationError } from './errors.js';

/**
 * FUTURE ROADMAP NOTE: Environment Namespace Strategy
 * For scaling SaaS infrastructures, consider transitioning from ambient environment variables 
 * (like PORT, HOST) to namespaced configurations (like APP_PORT, APP_HOST, APP_LOG_LEVEL). 
 * This isolates the product configurations completely from shell or container environment 
 * variables and prevents unexpected name collisions.
 */

let cachedConfig = null;

// Registry for deprecated configuration variables (graceful alerts without crash)
const DEPRECATED_VARS = {
  OLD_GOOGLE_API_KEY: 'GOOGLE_API_KEY',
};

// Strict list of allowed namespaces to construct Joi filter subset
const TARGET_PREFIXES = ['DATABASE_', 'REDIS_', 'JWT_', 'GOOGLE_'];
const TARGET_KEYS = new Set(['NODE_ENV', 'PORT', 'HOST', 'LOG_LEVEL', 'MOCK_GEO_IP', 'APP_VERSION', 'HEALTH_TIMEOUT_MS', 'SLOW_QUERY_THRESHOLD_MS', 'BCRYPT_COST', 'PASSWORD_RESET_EXPIRY_MS']);

/**
 * Deep recursive secret redaction engine.
 * Masks critical keys and applies credential-aware masking to URLs,
 * preserving safe operational metadata like hosts, databases, and ports.
 */
export function redactSecrets(obj) {
  const redacted = {};
  const secretKeywords = ['secret', 'key', 'password', 'token', 'credential', 'clientid'];

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSecrets(value);
    } else if (typeof value === 'string') {
      const lowerKey = key.toLowerCase();
      
      // Credential-aware URL parsing and masking (optimized prefix check avoids throwing inside exceptions for standard strings)
      if (value.includes('://')) {
        try {
          const parsed = new URL(value);
          if (parsed.password) {
            parsed.password = '*****'; // Redact ONLY the sensitive credentials
          }
          redacted[key] = parsed.toString();
          continue;
        } catch {
          // Fallback to keyword checking if URL parsing fails
        }
      }

      // Keyword matching for standard parameters
      const isSecret = secretKeywords.some((keyword) => lowerKey.includes(keyword));
      if (isSecret) {
        redacted[key] = '***** [REDACTED]';
      } else {
        redacted[key] = value;
      }
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function loadConfig() {
  if (cachedConfig) return cachedConfig;

  // 1. Snapshot native system environment variables (Docker / Kubernetes compliance)
  const systemEnv = { ...process.env };
  const nodeEnv = process.env.NODE_ENV || 'development';

  // 2. Load base environment file first (lowest precedence)
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, quiet: true });
  }

  // 3. Load specific environment overrides second (explicit dotenv override enabled)
  const envSpecificPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);
  if (fs.existsSync(envSpecificPath)) {
    dotenv.config({ path: envSpecificPath, override: true, quiet: true });
  }

  // 4. Restore original system environment snapshot to guarantee system variables maintain absolute precedence
  Object.assign(process.env, systemEnv);

  // 5. Emit developer deprecation alerts for legacy variables (bypassed in test environment to avoid noise)
  if (nodeEnv !== 'test') {
    for (const [deprecatedVar, replacement] of Object.entries(DEPRECATED_VARS)) {
      if (process.env[deprecatedVar]) {
        console.warn(
          `⚠️ DEPRECATION WARNING: Environment variable '${deprecatedVar}' is deprecated and will be removed in a future release. Please migrate to '${replacement}'.`
        );
      }
    }
  }

  // 6. Build strict filtered env object for Joi typo check
  const filteredEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    const isTargetPrefix = TARGET_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (TARGET_KEYS.has(key) || isTargetPrefix) {
      filteredEnv[key] = value;
    }
  }

  // 7. Trigger strict type Joi coercion & validation
  const { value, error } = configSchema.validate(filteredEnv, {
    abortEarly: false,
    stripUnknown: false, // Disallowing unknown fields on the filtered subset catches typos instantly!
  });

  if (error) {
    const errorDetails = error.details.map((d) => `${d.path.join('.')}: ${d.message}`).join(', ');
    throw new ConfigValidationError(`Environment validation failed: ${errorDetails}`, error.details);
  }

  // 8. Construct organized immutable configuration tree
  const config = {
    app: {
      env: value.NODE_ENV,
      port: value.PORT,
      host: value.HOST,
      version: value.APP_VERSION,
    },
    db: {
      url: value.DATABASE_URL,
      poolMin: value.DATABASE_POOL_MIN,
      poolMax: value.DATABASE_POOL_MAX,
      ssl: value.DATABASE_SSL,
    },
    redis: {
      url: value.REDIS_URL,
      prefix: value.REDIS_PREFIX,
      tls: value.REDIS_TLS,
    },
    auth: {
      jwtSecret: value.JWT_SECRET,
      jwtExpiry: value.JWT_EXPIRY,
      bcryptCost: value.BCRYPT_COST,
      passwordResetExpiryMs: value.PASSWORD_RESET_EXPIRY_MS,
    },
    services: {
      googleApiKey: value.GOOGLE_API_KEY,
      googleClientId: value.GOOGLE_CLIENT_ID,
      googleClientSecret: value.GOOGLE_CLIENT_SECRET,
    },
    telemetry: {
      logLevel: value.LOG_LEVEL,
      mockGeoIp: value.MOCK_GEO_IP,
      healthTimeoutMs: value.HEALTH_TIMEOUT_MS,
      slowQueryThresholdMs: value.SLOW_QUERY_THRESHOLD_MS,
    },
  };

  // 9. Recursively freeze Singleton structure
  cachedConfig = deepFreeze(config);
  return cachedConfig;
}

function deepFreeze(obj) {
  Object.freeze(obj);
  Object.keys(obj).forEach((key) => {
    if (
      obj[key] !== null &&
      (typeof obj[key] === 'object' || typeof obj[key] === 'function') &&
      !Object.isFrozen(obj[key])
    ) {
      deepFreeze(obj[key]);
    }
  });
  return obj;
}
