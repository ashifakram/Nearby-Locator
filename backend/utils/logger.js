import { AsyncLocalStorage } from 'async_hooks';
import pino from 'pino';
import os from 'os';
import config from '../config/index.js';

export const correlationStore = new AsyncLocalStorage();

const SENSITIVE_KEYS = new Set([
  'password', 'password_hash', 'newpassword', 'newPassword', 'oldpassword', 'oldPassword',
  'refreshtoken', 'refreshToken', 'refresh_token_hash',
  'token', 'authorization', 'cookie', 'secret', 'password_reset_token_hash',
  'email_verification_token_hash', 'google_id', 'googleapikey', 'googleApiKey', 
  'jwtsecret', 'jwtSecret', 'clientsecret', 'clientSecret', 'accesstoken', 'accessToken',
  'apikey', 'api_key', 'key', 'pass'
]);

// Initialize Pino instance
const pinoOptions = {
  level: config.app.env === 'test' && process.env.FORCE_LOGGING !== 'true' ? 'silent' : 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  base: {
    service: 'nearby-locator-backend',
    env: config.app.env,
    hostname: os.hostname(),
    pid: process.pid,
    version: process.env.npm_package_version || '1.0.0'
  },
  redact: {
    paths: [...Array.from(SENSITIVE_KEYS).map(k => `*.[*].${k}`), ...Array.from(SENSITIVE_KEYS)],
    censor: '[REDACTED]'
  }
};

// Use pino-pretty only in dev, raw JSON everywhere else
export const pinoInstance = config.app.env === 'development' 
  ? pino({ ...pinoOptions, transport: { target: 'pino-pretty', options: { colorize: true } } })
  : pino(pinoOptions);

const warningCaps = new Map();
const checkWarningThrottled = (categoryCode) => { return false; }; // Simplified for now
export const closeWarningTimers = () => {};
export const clearWarningCaps = () => {};

export const logger = {
  info(message, meta = {}, category = 'APP') {
    this._write('info', category, message, meta);
  },
  warn(categoryCode, message, meta = {}) {
    this._write('warn', categoryCode, message, meta);
  },
  error(categoryCode, message, err = null, meta = {}) {
    const payload = { ...meta };
    if (err) { payload.err = pino.stdSerializers.err(err); }
    this._write('error', categoryCode, message, payload);
  },
  audit(actionCode, message, meta = {}) {
    const cleanMeta = { ...meta };
    delete cleanMeta.stack;
    delete cleanMeta.sql;
    delete cleanMeta.bindings;
    this._write('info', `AUDIT_${actionCode}`, message, cleanMeta);
  },
  _write(pinoLevel, category, message, meta) {
    const store = correlationStore.getStore() || {};
    pinoInstance[pinoLevel]({
      category,
      correlation_id: store.requestId,
      user_id: store.userId,
      ...meta
    }, message);
  }
};
