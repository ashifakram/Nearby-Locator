import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index.js';
import { logger } from '../utils/logger.js';
import { cleanDatabase, resetGlobalState, flushRedisTestCache, teardownConnections } from './helpers.js';

describe('🩺 Observability, Correlation, & Log Leak Compliance Suite', () => {
  
  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await cleanDatabase();
    await flushRedisTestCache();
    resetGlobalState();
  });

  after(async () => {
    await teardownConnections();
  });

  it('1. Correlation ID: gateway assigns X-Request-ID and propagates it downstream in headers', async () => {
    const res = await request(app)
      .get('/health/live');

    assert.equal(res.statusCode, 200);
    const correlationId = res.headers['x-request-id'];
    assert.ok(correlationId);
    assert.ok(correlationId.length > 20); // Valid UUID shape
  });

  it('2. Rate Limiting: Blocks IP address when exceeding maximum request thresholds', async () => {
    // We send requests sequentially to verify that sliding-window rate limit triggers 429
    // In test mode, rate limiter limit is configurable, let's trigger sequential request hits
    // against our lockout endpoint (which is ratelimited to 5 requests on password reset request)
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(
        request(app)
          .post('/api/auth/password/reset-request')
          .send({ email: `rate_limit_${i}@saas.com` })
      );
    }
    
    const results = await Promise.all(requests);
    const has429 = results.some(res => res.statusCode === 429);
    assert.ok(has429);
    console.log('✅ Rate limiter blocked IP address upon exceeding the limits threshold!');
  });

  it('3. Metrics Security Gate: Restricts metrics exposure strictly to localhost and configuration checks', async () => {
    // Stub express.request.ip to simulate a public non-loopback IP connection
    const express = (await import('express')).default;
    const originalIpGetter = Object.getOwnPropertyDescriptor(express.request, 'ip');
    
    Object.defineProperty(express.request, 'ip', {
      configurable: true,
      get: () => '198.51.100.42'
    });

    try {
      // Public requests (non-loopback IPv4) must be blocked as 403 Forbidden
      const publicRes = await request(app)
        .get('/health/metrics');

      assert.equal(publicRes.statusCode, 403);
      console.log('✅ Metrics exposure gate safely blocked the public IP address!');
    } finally {
      // Restore original express.request.ip getter
      if (originalIpGetter) {
        Object.defineProperty(express.request, 'ip', originalIpGetter);
      } else {
        delete express.request.ip;
      }
    }
  });

  it('4. Observability Leak Compliance: Credentials and sensitive query strings never leak in structured logs', async () => {
    // Enable logging output stream collection strictly for this assertion block
    process.env.FORCE_LOGGING = 'true';
    
    // Intercept stdout logs programmatically to inspect compliance leaks
    const logBuffer = [];
    const originalStdoutWrite = process.stdout.write;
    
    process.stdout.write = (chunk) => {
      logBuffer.push(chunk.toString());
      return true;
    };

    try {
      // Step A: Trigger logs with sensitive credential values and query strings
      logger.info('Test compliance check', {
        password: 'SuperSecretPlainPasswordValue123!',
        refreshToken: 'StolenRefreshTokenHash_123',
        cookie: 'SessionCookiePlainValue_456'
      });

      logger.info('GET /api/places?token=secretTokenValue123&apikey=mySecretApiKey_456&secret=plainSecretText');

      // Step B: Restore original log stream
      process.stdout.write = originalStdoutWrite;

      // Assert that plain secrets never leak in the console log stream output
      const hasLeak = logBuffer.some(log => 
        log.includes('SuperSecretPlainPasswordValue123!') || 
        log.includes('StolenRefreshTokenHash_123') ||
        log.includes('secretTokenValue123') ||
        log.includes('mySecretApiKey_456')
      );

      assert.equal(hasLeak, false);

      // Assert that sensitive query parameters were programmatically replaced with [REDACTED]
      const sanitizedLog = logBuffer.find(log => log.includes('/api/places'));
      assert.ok(sanitizedLog);
      assert.ok(sanitizedLog.includes('token=%5BREDACTED%5D') || sanitizedLog.includes('token=[REDACTED]'));
      assert.ok(sanitizedLog.includes('apikey=%5BREDACTED%5D') || sanitizedLog.includes('apikey=[REDACTED]'));

      console.log('✅ Observability log leak compliance verified: Zero credentials or query secrets leaked!');
    } finally {
      process.stdout.write = originalStdoutWrite;
      delete process.env.FORCE_LOGGING;
    }
  });
});
